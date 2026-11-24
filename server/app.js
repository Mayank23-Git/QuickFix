import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { getDbConnectionMode, getLastAtlasError, initDatabaseOnce } from './config/db.js';
import { seedDemoDataIfEmpty } from './seed/seed.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import achievementRoutes, { publicVerifyRouter } from './routes/achievementRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import skillGrowthRoutes from './routes/skillGrowthRoutes.js';

export function createApiApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const origin = req.headers.origin;
    const allowedOrigins = [env.clientOrigin, env.appUrl].filter(Boolean);
    const requestHost = req.headers['x-forwarded-host'] || req.headers.host;

    if (origin) {
      let isSameHost = false;
      try {
        if (requestHost && new URL(origin).host === String(requestHost).split(',')[0].trim()) {
          isSameHost = true;
        }
      } catch {
        isSameHost = false;
      }

      if (isSameHost || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Vary', 'Origin');
      }
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
      service: 'peerup-api',
      databaseMode: getDbConnectionMode(),
      ...(getLastAtlasError() ? { atlasWarning: 'MongoDB Atlas unreachable; verify 0.0.0.0/0 IP whitelist in Atlas Network Access.' } : {}),
    });
  });

  // Ensure MongoDB connection and seeding have completed before handling API data routes
  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') return next();
    try {
      if (mongoose.connection.readyState !== 1) {
        await initDatabaseOnce(seedDemoDataIfEmpty);
      }
      return next();
    } catch {
      return res.status(503).json({
        error:
          'Database connection unavailable. If using MongoDB Atlas, verify your MONGODB_URI and ensure 0.0.0.0/0 is whitelisted in Atlas Network Access.',
      });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/achievements', achievementRoutes);
  app.use('/api/verify', publicVerifyRouter);
  app.use('/api/admin', adminRoutes);
  app.use('/api/skill-growth', skillGrowthRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  app.use((err, _req, res, _next) => {
    console.error('[Server Unhandled Error]', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
