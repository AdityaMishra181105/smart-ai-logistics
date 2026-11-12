import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || rawApiUrl.replace(/\/api\/?$/, '');

let socket = null;

/**
 * Custom hook for Socket.IO real-time communication
 * Manages connection, event listeners, and automatic reconnection
 */
const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    if (!socket) {
      console.log('[Socket.IO] Initializing connection to:', SOCKET_URL);
      
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socket.on('connect', () => {
        console.log('[Socket.IO] Connected successfully');
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket.IO] Disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[Socket.IO] Connection error:', error.message);
        setConnectionError(error.message);
        setIsConnected(false);
      });
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive for app lifetime
    };
  }, []);

  /**
   * Subscribe to a socket event
   */
  const on = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback);
      
      return () => {
        socket.off(event, callback);
      };
    }
  }, []);

  /**
   * Emit a socket event
   */
  const emit = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('[Socket.IO] Cannot emit - not connected');
    }
  }, [isConnected]);

  return {
    socket,
    isConnected,
    connectionError,
    on,
    emit
  };
};

export default useSocket;
