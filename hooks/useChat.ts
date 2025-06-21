import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from './useSocket';
import { toast } from 'sonner';

interface TypingUser {
  userId: string;
  userName: string;
  chatRoomId: string;
}

export function useChat(chatRoomId: string | null) {
  const { socket, isConnected, sendMessage: socketSendMessage } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle typing indicators
  useSocketEvent('user-typing', (data: TypingUser) => {
    if (data.chatRoomId === chatRoomId) {
      setTypingUsers(prev => {
        const exists = prev.some(u => u.userId === data.userId);
        if (exists) return prev;
        return [...prev, data];
      });
    }
  });

  useSocketEvent('user-stopped-typing', (data: { chatRoomId: string; userId: string }) => {
    if (data.chatRoomId === chatRoomId) {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    }
  });

  const startTyping = useCallback(() => {
    if (!chatRoomId || !socket || !isConnected) return;

    socket.emit('typing-start', { chatRoomId });

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 3 seconds
    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);

    setTypingTimeout(timeout);
  }, [chatRoomId, socket, isConnected, typingTimeout]);

  const stopTyping = useCallback(() => {
    if (!chatRoomId || !socket || !isConnected) return;

    socket.emit('typing-stop', { chatRoomId });

    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  }, [chatRoomId, socket, isConnected, typingTimeout]);

  const sendMessage = useCallback((content: string, attachments?: string[]) => {
    if (!chatRoomId) return;
    
    socketSendMessage(chatRoomId, content, attachments);
    stopTyping();
  }, [chatRoomId, socketSendMessage, stopTyping]);

  const markAsRead = useCallback(() => {
    if (!chatRoomId || !socket || !isConnected) return;
    
    socket.emit('mark-as-read', { chatRoomId });
  }, [chatRoomId, socket, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      stopTyping();
    };
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    sendMessage,
    markAsRead,
    isConnected,
  };
}
