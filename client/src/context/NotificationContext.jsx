import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';
import { apiRequest, getAuthToken } from '../services/api.js';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const sessionListenersRef = useRef(new Set());
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const notifySessionSubscribers = useCallback((eventType, payload) => {
    for (const listener of sessionListenersRef.current) {
      try {
        listener(eventType, payload);
      } catch {
        // Ignore subscriber errors
      }
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Non-fatal background fetch
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Connect authenticated Socket.IO client when logged in
  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketConnected(false);
      return undefined;
    }

    const token = getAuthToken();
    const socket = io({
      withCredentials: true,
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      refreshNotifications();
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
    });

    socket.on('notification:new', (payload) => {
      const incoming = payload?.notification;
      if (!incoming?._id) return;

      setNotifications((prev) => {
        if (prev.some((item) => String(item._id) === String(incoming._id))) {
          return prev;
        }
        return [incoming, ...prev].slice(0, 40);
      });

      if (!incoming.read) {
        setUnreadCount((prev) => prev + 1);
      }

      if (incoming.type === 'session_cancelled') {
        toastRef.current.error(incoming.message);
      } else if (incoming.type === 'session_accepted' || incoming.type === 'session_started') {
        toastRef.current.success(incoming.message);
      } else {
        toastRef.current.info(incoming.message);
      }
    });

    const handleSessionEvent = (eventName) => (payload) => {
      notifySessionSubscribers(eventName, payload);
    };

    socket.on('session:updated', handleSessionEvent('session:updated'));
    socket.on('session:started', handleSessionEvent('session:started'));
    socket.on('session:completed', handleSessionEvent('session:completed'));
    socket.on('session:cancelled', handleSessionEvent('session:cancelled'));

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setSocketConnected(false);
    };
  }, [isAuthenticated, user?._id, refreshNotifications, notifySessionSubscribers]);

  // Automatic polling fallback when Socket.IO is unavailable/disconnected
  useEffect(() => {
    if (!isAuthenticated || socketConnected) return undefined;

    const interval = setInterval(() => {
      refreshNotifications();
      notifySessionSubscribers('poll:tick', {});
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, socketConnected, refreshNotifications, notifySessionSubscribers]);

  const markRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    setNotifications((prev) =>
      prev.map((n) => (String(n._id) === String(notificationId) ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const data = await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
    } catch {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const subscribeSessionEvents = useCallback((listener) => {
    sessionListenersRef.current.add(listener);
    return () => {
      sessionListenersRef.current.delete(listener);
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        socketConnected,
        socket: socketRef.current,
        refreshNotifications,
        markRead,
        markAllRead,
        subscribeSessionEvents,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return ctx;
}
