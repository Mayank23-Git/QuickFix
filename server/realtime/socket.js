import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HelpSession } from '../models/HelpSession.js';
import { parseCookies, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import { isValidObjectId } from '../utils/sanitize.js';

let ioInstance = null;

function isOriginAllowed(origin, hostHeader) {
  if (!origin) return true;
  const allowedOrigins = [env.clientOrigin, env.appUrl].filter(Boolean);
  if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
    return true;
  }
  if (hostHeader) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === String(hostHeader).split(',')[0].trim()) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

export function initSocketServer(httpServer) {
  if (ioInstance) return ioInstance;

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by Socket.IO CORS'));
        }
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authenticate every socket connection via JWT (auth.token or httpOnly session cookie)
  io.use(async (socket, next) => {
    try {
      let token = '';
      if (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth.token.trim()) {
        token = socket.handshake.auth.token.trim();
      } else {
        const cookies = parseCookies(socket.handshake.headers?.cookie || '');
        token = cookies[SESSION_COOKIE_NAME] || '';
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.sub).select('-passwordHash').lean();
      if (!user) {
        return next(new Error('User session is no longer valid'));
      }

      socket.user = user;
      return next();
    } catch {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    socket.on('session:join', async (payload, callback) => {
      try {
        const sessionId = String(payload?.sessionId || '');
        if (!isValidObjectId(sessionId)) {
          if (typeof callback === 'function') callback({ ok: false, error: 'Invalid session ID' });
          return;
        }

        const session = await HelpSession.findById(sessionId)
          .select('requesterId helperId status')
          .lean();
        if (!session) {
          if (typeof callback === 'function') callback({ ok: false, error: 'Session not found' });
          return;
        }

        const isParticipant =
          String(session.requesterId) === userId || String(session.helperId) === userId;
        if (!isParticipant) {
          if (typeof callback === 'function') callback({ ok: false, error: 'Access denied' });
          return;
        }

        const roomKey = `session:${sessionId}`;
        await socket.join(roomKey);

        const socketsInRoom = await io.in(roomKey).fetchSockets();
        const peers = socketsInRoom
          .filter((s) => String(s.user?._id) !== userId)
          .map((s) => ({
            userId: String(s.user._id),
            fullName: s.user.fullName,
          }));

        socket.to(roomKey).emit('webrtc:peer-joined', {
          sessionId,
          userId,
          fullName: socket.user.fullName,
        });

        if (typeof callback === 'function') {
          callback({ ok: true, peers });
        }
      } catch {
        if (typeof callback === 'function') callback({ ok: false, error: 'Unable to join room' });
      }
    });

    socket.on('session:leave', (payload) => {
      const sessionId = String(payload?.sessionId || '');
      if (!isValidObjectId(sessionId)) return;
      const roomKey = `session:${sessionId}`;
      socket.leave(roomKey);
      socket.to(roomKey).emit('webrtc:peer-left', {
        sessionId,
        userId,
      });
    });

    const relaySignaling = (eventName) => (payload) => {
      const sessionId = String(payload?.sessionId || '');
      if (!isValidObjectId(sessionId)) return;
      const roomKey = `session:${sessionId}`;
      if (!socket.rooms.has(roomKey)) return;

      socket.to(roomKey).emit(eventName, {
        ...payload,
        sessionId,
        fromUserId: userId,
        fromName: socket.user.fullName,
      });
    };

    socket.on('webrtc:offer', relaySignaling('webrtc:offer'));
    socket.on('webrtc:answer', relaySignaling('webrtc:answer'));
    socket.on('webrtc:ice-candidate', relaySignaling('webrtc:ice-candidate'));

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('session:')) {
          const sessionId = room.slice('session:'.length);
          socket.to(room).emit('webrtc:peer-left', {
            sessionId,
            userId,
          });
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

export function getSocketServer() {
  return ioInstance;
}

export function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${String(userId)}`).emit(event, payload);
}

export function emitToSession(sessionId, event, payload) {
  if (!ioInstance || !sessionId) return;
  ioInstance.to(`session:${String(sessionId)}`).emit(event, payload);
}
