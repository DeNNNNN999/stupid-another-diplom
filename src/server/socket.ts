import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

interface SocketUser {
  userId: string;
  socketId: string;
  email: string;
  name: string;
}

const connectedUsers = new Map<string, SocketUser>();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`User ${user.name} connected`);

  // Store connected user
  const userInfo = {
    userId: user.id,
    socketId: socket.id,
    email: user.email,
    name: user.name,
  };
  connectedUsers.set(user.id, userInfo);

  // Notify others about user coming online
  socket.broadcast.emit('user-online', userInfo);

  // Join user's rooms
  socket.on('join-rooms', async () => {
    try {
      const userRooms = await prisma.chatRoomUser.findMany({
        where: { userId: user.id },
        select: { chatRoomId: true },
      });

      for (const room of userRooms) {
        socket.join(`room:${room.chatRoomId}`);
      }

      // Send online users list
      socket.emit('online-users', Array.from(connectedUsers.values()));
    } catch (error) {
      console.error('Error joining rooms:', error);
    }
  });

  // Handle sending messages
  socket.on('send-message', async (data) => {
    try {
      const { chatRoomId, content, attachments = [] } = data;

      // Create message in DB
      const message = await prisma.message.create({
        data: {
          content,
          attachments,
          senderId: user.id,
          chatRoomId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });

      // Emit to all users in the room
      io.to(`room:${chatRoomId}`).emit('new-message', {
        chatRoomId,
        message,
      });

    // Send push notification to offline users
    const roomUsers = await prisma.chatRoomUser.findMany({
      where: {
        chatRoomId,
        userId: { not: user.id },
      },
      select: { userId: true },
    });

    for (const roomUser of roomUsers) {
      if (!connectedUsers.has(roomUser.userId)) {
        // Create notification for offline user
        await prisma.notification.create({
          data: {
            title: 'Новое сообщение',
            content: `${user.name}: ${content.substring(0, 50)}...`,
            type: 'MESSAGE',
            userId: roomUser.userId,
          },
        });
      }
    }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', ({ chatRoomId }) => {
    socket.to(`room:${chatRoomId}`).emit('user-typing', {
      chatRoomId,
      userId: user.id,
      userName: user.name,
    });
  });

  socket.on('typing-stop', ({ chatRoomId }) => {
    socket.to(`room:${chatRoomId}`).emit('user-stopped-typing', {
      chatRoomId,
      userId: user.id,
    });
  });

  // Handle marking messages as read
  socket.on('mark-as-read', async ({ chatRoomId }) => {
    try {
      await prisma.message.updateMany({
        where: {
          chatRoomId,
          recipientId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      socket.to(`room:${chatRoomId}`).emit('messages-read', {
        chatRoomId,
        userId: user.id,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Conference room handling
  socket.on('join-conference', async ({ conferenceId }) => {
    try {
      socket.join(`conference:${conferenceId}`);
      
      // Get current participants
      const room = io.sockets.adapter.rooms.get(`conference:${conferenceId}`);
      const participants = [];
      
      if (room) {
        for (const socketId of room) {
          const participantSocket = io.sockets.sockets.get(socketId);
          if (participantSocket && participantSocket.data.user) {
            participants.push({
              userId: participantSocket.data.user.id,
              name: participantSocket.data.user.name,
              email: participantSocket.data.user.email,
              socketId: socketId,
            });
          }
        }
      }
      
      // Send current participants to the new user
      socket.emit('conference-participants', participants);
      
      // Notify others about new participant
      socket.to(`conference:${conferenceId}`).emit('participant-joined', {
        userId: user.id,
        name: user.name,
        email: user.email,
        socketId: socket.id,
      });
    } catch (error) {
      console.error('Error joining conference:', error);
      socket.emit('error', { message: 'Failed to join conference' });
    }
  });

  // WebRTC signaling
  socket.on('offer', ({ userId, signal, conferenceId }) => {
    const targetUser = Array.from(connectedUsers.values()).find(u => u.userId === userId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('offer', {
        userId: user.id,
        signal,
        conferenceId,
      });
    }
  });

  socket.on('answer', ({ userId, signal, conferenceId }) => {
    const targetUser = Array.from(connectedUsers.values()).find(u => u.userId === userId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('answer', {
        userId: user.id,
        signal,
        conferenceId,
      });
    }
  });

  socket.on('ice-candidate', ({ userId, candidate, conferenceId }) => {
    const targetUser = Array.from(connectedUsers.values()).find(u => u.userId === userId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('ice-candidate', {
        userId: user.id,
        candidate,
        conferenceId,
      });
    }
  });

  socket.on('leave-conference', ({ conferenceId }) => {
    socket.leave(`conference:${conferenceId}`);
    socket.to(`conference:${conferenceId}`).emit('participant-left', {
      userId: user.id,
    });
  });

  // Media state changes
  socket.on('toggle-mute', ({ conferenceId, isMuted }) => {
    socket.to(`conference:${conferenceId}`).emit('participant-muted', {
      userId: user.id,
      isMuted,
    });
  });

  socket.on('toggle-video', ({ conferenceId, isVideoOff }) => {
    socket.to(`conference:${conferenceId}`).emit('participant-video-toggled', {
      userId: user.id,
      isVideoOff,
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${user.name} disconnected`);
    connectedUsers.delete(user.id);

    // Notify others about user going offline
    io.emit('user-offline', user.id);
    
    // Notify conference participants
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('conference:')) {
        socket.to(room).emit('participant-left', {
          userId: user.id,
        });
      }
    });
  });
});

httpServer.listen(SOCKET_PORT, () => {
  console.log(`Socket.io server running on port ${SOCKET_PORT}`);
});

export { io };
