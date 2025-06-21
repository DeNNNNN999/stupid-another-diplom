import { useState, useEffect } from 'react';
import { useSocket, useSocketEvent } from './useSocket';

interface OnlineUser {
  userId: string;
  socketId: string;
  email: string;
  name: string;
}

export function useOnlineStatus() {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Handle online users list
  useSocketEvent('online-users', (users: OnlineUser[]) => {
    console.log('📊 Received online users:', users.length);
    setOnlineUsers(users);
  });

  // Handle user going offline
  useSocketEvent('user-offline', (userId: string) => {
    console.log('👋 User went offline:', userId);
    setOnlineUsers(prev => prev.filter(user => user.userId !== userId));
  });

  // Handle new user coming online
  useSocketEvent('user-online', (user: OnlineUser) => {
    console.log('👋 User came online:', user.name);
    setOnlineUsers(prev => {
      const exists = prev.some(u => u.userId === user.userId);
      if (exists) return prev;
      return [...prev, user];
    });
  });

  // Request online users when connected
  useEffect(() => {
    if (socket && isConnected) {
      console.log('🔄 Requesting online users...');
      socket.emit('join-rooms');
    }
  }, [socket, isConnected]);

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  const getUserStatus = (userId: string) => {
    const user = onlineUsers.find(u => u.userId === userId);
    return user ? 'online' : 'offline';
  };

  return {
    onlineUsers,
    isUserOnline,
    getUserStatus,
    onlineCount: onlineUsers.length,
    isConnected,
  };
}