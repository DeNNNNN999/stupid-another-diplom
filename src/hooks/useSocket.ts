'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/src/context/AuthContext';
import { toast } from 'sonner';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useSocket = (options?: UseSocketOptions) => {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Initialize socket connection
    const socket = io('http://localhost:3001', {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-rooms');
      options?.onConnect?.();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      options?.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      options?.onError?.(error);
    });

    // Online users
    socket.on('online-users', (users) => {
      setOnlineUsers(users.map((u: any) => u.userId));
    });

    socket.on('user-offline', (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const sendMessage = (chatRoomId: string, content: string, attachments?: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', {
        chatRoomId,
        content,
        attachments: attachments || [],
      });
    }
  };

  const startTyping = (chatRoomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-start', { chatRoomId });
    }
  };

  const stopTyping = (chatRoomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', { chatRoomId });
    }
  };

  const markAsRead = (chatRoomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark-as-read', { chatRoomId });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
};

// Hook for listening to socket events
export const useSocketEvent = (eventName: string, handler: (...args: any[]) => void) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName, handler]);
};
