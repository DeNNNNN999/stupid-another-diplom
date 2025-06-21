import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (chatRoomId: string, content: string, attachments?: string[]) => void;
  error: string | null;
  connectionAttempts: number;
}

let socketInstance: Socket | null = null;

export function useSocket(): UseSocketReturn {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;

  const connectSocket = useCallback(() => {
    if (!user || !token || socketInstance?.connected) return;

    console.log('🔌 Connecting to Socket.io server...');
    
    try {
      // Disconnect existing socket if any
      if (socketInstance) {
        socketInstance.disconnect();
      }

      // Create new socket instance with browser-optimized configuration
      socketInstance = io(SOCKET_URL, {
        auth: {
          token,
        },
        // Browser-optimized transport configuration
        transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
        forceNew: true,
        // Disable problematic options for browser
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
      });

      // Connection successful
      socketInstance.on('connect', () => {
        console.log('✅ Socket.io connected with transport:', socketInstance?.io.engine.transport.name);
        setSocket(socketInstance);
        setIsConnected(true);
        setError(null);
        setConnectionAttempts(0);
        
        // Join user's rooms
        socketInstance?.emit('join-rooms');
        
        toast.success('Подключение к чату установлено');

        // Log transport upgrades
        socketInstance?.io.engine.on('upgrade', (transport) => {
          console.log('🔄 Socket.io transport upgraded to:', transport.name);
        });
      });

      // Connection error
      socketInstance.on('connect_error', (err) => {
        console.error('❌ Socket.io connection error:', err.message);
        setError(err.message);
        setIsConnected(false);
        
        // Retry connection with exponential backoff
        if (connectionAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
          console.log(`🔄 Retrying connection in ${delay}ms (attempt ${connectionAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connectSocket();
          }, delay);
        } else {
          toast.error('Не удалось подключиться к чату. Попробуйте обновить страницу.');
        }
      });

      // Disconnection
      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket.io disconnected:', reason);
        setIsConnected(false);
        setSocket(null);
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          toast.warning('Соединение с чатом прервано. Попытка переподключения...');
          setTimeout(() => connectSocket(), 1000);
        }
      });

      // Authentication error
      socketInstance.on('error', (error) => {
        console.error('🔒 Socket.io authentication error:', error);
        setError('Ошибка аутентификации');
        toast.error('Ошибка доступа к чату');
      });

      // Reconnection events
      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Socket.io reconnected after ${attemptNumber} attempts`);
        toast.success('Соединение с чатом восстановлено');
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('🔄 Socket.io reconnection failed:', error.message);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('🔄 Socket.io reconnection failed permanently');
        toast.error('Не удалось восстановить соединение с чатом');
      });

    } catch (err) {
      console.error('❌ Failed to create socket:', err);
      setError('Не удалось создать соединение');
    }
  }, [user, token, connectionAttempts]);

  const disconnectSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketInstance) {
      console.log('🔌 Disconnecting socket...');
      socketInstance.disconnect();
      socketInstance = null;
    }
    
    setSocket(null);
    setIsConnected(false);
    setError(null);
    setConnectionAttempts(0);
  }, []);

  const sendMessage = useCallback((chatRoomId: string, content: string, attachments: string[] = []) => {
    if (!socketInstance || !isConnected) {
      console.warn('⚠️ Socket not connected, cannot send message');
      toast.error('Нет соединения с чатом');
      return;
    }

    console.log('📤 Sending message via socket:', { chatRoomId, content });
    socketInstance.emit('send-message', {
      chatRoomId,
      content,
      attachments,
    });
  }, [isConnected]);

  // Connect when user and token are available
  useEffect(() => {
    if (user && token && typeof window !== 'undefined') {
      connectSocket();
    } else {
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [user, token, connectSocket, disconnectSocket]);

  // Cleanup on window unload
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && token && !isConnected) {
        // Page became visible and we're not connected, try to reconnect
        console.log('👁️ Page visible, attempting to reconnect...');
        connectSocket();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, token, isConnected, connectSocket]);

  return {
    socket,
    isConnected,
    sendMessage,
    error,
    connectionAttempts,
  };
}

// Hook for listening to socket events
export function useSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log(`👂 Listening to socket event: ${event}`);
    socket.on(event, handler);

    return () => {
      console.log(`🔇 Removing socket event listener: ${event}`);
      socket.off(event, handler);
    };
  }, [socket, isConnected, event, ...deps]);
}

// Export socket instance for direct access (backward compatibility)
export default function useSocketCompat(): Socket | null {
  const { socket } = useSocket();
  return socket;
}