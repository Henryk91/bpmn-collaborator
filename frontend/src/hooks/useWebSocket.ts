/** Custom hook for WebSocket connection and message handling. */
import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL, WEBSOCKET_RECONNECT_DELAY, MESSAGE_TYPES } from '../constants';
import { AllWebSocketMessages, ElementLock } from '../types';

interface UseWebSocketOptions {
  diagramId: string | undefined;
  userName: string | undefined;
  onMessage?: (message: AllWebSocketMessages) => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  connected: boolean;
  sendMessage: (type: string, data?: any) => void;
  users: string[];
  elementLocks: Record<string, ElementLock>;
}

export const useWebSocket = ({
  diagramId,
  userName,
  onMessage,
  onError,
}: UseWebSocketOptions): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [elementLocks, setElementLocks] = useState<Record<string, ElementLock>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const myUserNameRef = useRef<string>('');
  const isConnectingRef = useRef<boolean>(false);
  const isUnmountingRef = useRef<boolean>(false);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  const sendMessage = useCallback(
    (type: string, data?: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, data }));
      }
    },
    []
  );

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: AllWebSocketMessages = JSON.parse(event.data);

      switch (message.type) {
        case MESSAGE_TYPES.DIAGRAM_STATE:
          if (message.data?.locks) {
            setElementLocks(message.data.locks);
          }
          // Always pass to handler for XML loading and other processing
          onMessageRef.current?.(message);
          break;

        case MESSAGE_TYPES.DIAGRAM_UPDATE:
          // Always pass diagram updates to handler, it will check if it's from another user
          onMessageRef.current?.(message);
          if (message.data?.locks) {
            setElementLocks(message.data.locks);
          }
          break;

        case MESSAGE_TYPES.USER_LIST:
          if (message.data?.users) {
            setUsers(message.data.users);
            if (!myUserNameRef.current && message.data.users.length > 0) {
              myUserNameRef.current = message.data.users[message.data.users.length - 1];
            }
          }
          break;

        case MESSAGE_TYPES.ELEMENT_LOCKED:
          if (message.data && 'element_id' in message.data) {
            
            const elementId = message.data.element_id as string;
            const userId = message.data.user_id as string;
            const userName = message.data.user_name as string;
            
            setElementLocks((prev) => ({
              ...prev,
              [elementId]: {
                user_id: userId,
                user_name: userName,
              },
            }));
          }
          // Pass to handler for marker updates
          onMessageRef.current?.(message);
          break;

        case MESSAGE_TYPES.ELEMENT_UNLOCKED:
          if (message.data && 'element_id' in message.data) {
            const elementId = message.data.element_id as string;
            setElementLocks((prev) => {
              const newLocks = { ...prev };
              delete newLocks[elementId];
              return newLocks;
            });
          }
          // Pass to handler for marker updates
          onMessageRef.current?.(message);
          break;

        case MESSAGE_TYPES.LOCKS_UPDATE:
          if (message.data?.locks) {
            setElementLocks(message.data.locks);
          }
          break;
        case MESSAGE_TYPES.USER_JOINED:
        case MESSAGE_TYPES.USER_LEFT:
          // Request updated user list when someone joins or leaves
          // The backend should send user_list, but we can also request it
          onMessageRef.current?.(message);
          break;

        default:
          onMessageRef.current?.(message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, []);

  const connect = useCallback(() => {
    if (!diagramId || isConnectingRef.current || isUnmountingRef.current) return;

    // Close existing connection if any
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore errors when closing
      }
      wsRef.current = null;
    }

    isConnectingRef.current = true;
    
    try {
      // Build WebSocket URL with optional user name
      let wsUrl = `${WS_URL}/ws/${diagramId}`;
      if (userName && userName.trim()) {
        wsUrl += `?user_name=${encodeURIComponent(userName.trim())}`;
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountingRef.current) {
          ws.close();
          return;
        }
        setConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        // Only log meaningful errors (not connection failures that will retry)
        // The error event doesn't provide much detail, so we check readyState
        if (ws.readyState === WebSocket.CLOSED) {
          // Connection failed - will be handled by onclose
          isConnectingRef.current = false;
        } else if (ws.readyState === WebSocket.OPEN) {
          // Error while connected - this is a real error
          console.error('WebSocket error while connected');
          onErrorRef.current?.(error);
        }
      };

      ws.onclose = (event) => {
        setConnected(false);
        isConnectingRef.current = false;
        
        // Don't reconnect if unmounting or normal closure
        if (isUnmountingRef.current || event.code === 1000) {
          return;
        }
        
        // Only attempt reconnect if we still have a diagramId
        if (diagramId && !isUnmountingRef.current) {
          reconnectAttemptsRef.current += 1;
          
          // Exponential backoff with max delay of 30 seconds
          const delay = Math.min(
            WEBSOCKET_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
            30000
          );
          
          // Only log after multiple failed attempts
          if (reconnectAttemptsRef.current > 3) {
            console.warn(`WebSocket reconnection attempt ${reconnectAttemptsRef.current} for diagram ${diagramId}`);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountingRef.current && diagramId) {
              connect();
            }
          }, delay);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error('Error creating WebSocket:', error);
    }
  }, [diagramId, userName, handleMessage]);

  useEffect(() => {
    if (!diagramId) return;

    isUnmountingRef.current = false;
    
    // Delay WebSocket connection slightly to allow diagram to load first
    const connectTimeout = setTimeout(() => {
      if (!isUnmountingRef.current && diagramId) {
        connect();
      }
    }, 100);

    return () => {
      clearTimeout(connectTimeout);
      isUnmountingRef.current = true;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Component unmounting');
        } catch (e) {
          // Ignore errors when closing
        }
        wsRef.current = null;
      }
      
      isConnectingRef.current = false;
    };
  }, [diagramId, connect]);

  return {
    connected,
    sendMessage,
    users,
    elementLocks,
  };
};

