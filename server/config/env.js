import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const fallbackJwtSecret = crypto.randomBytes(32).toString('hex');

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: (process.env.MONGODB_URI || '').trim(),
  jwtSecret: (process.env.JWT_SECRET || '').trim() || fallbackJwtSecret,
  seedDemoData: process.env.SEED_DEMO_DATA !== 'false',
  clientOrigin: (process.env.CLIENT_ORIGIN || '').trim(),
  appUrl: (process.env.APP_URL || '').trim(),
  adminPasscode: (process.env.ADMIN_CLAIM_PASSCODE || '').trim(),
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
};
