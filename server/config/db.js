import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;
let connectionMode = 'unconnected';
let lastAtlasError = null;
let initPromise = null;

export function getDbConnectionMode() {
  return connectionMode;
}

export function getLastAtlasError() {
  return lastAtlasError;
}

async function startLocalPreviewMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.resolve(process.cwd(), '.data/mongo-preview');
  fs.mkdirSync(dbPath, { recursive: true });

  // Clean up stale zero-byte mongod.lock if a prior dev container exited abruptly
  const lockFile = path.join(dbPath, 'mongod.lock');
  if (fs.existsSync(lockFile)) {
    try {
      const stat = fs.statSync(lockFile);
      if (stat.size === 0) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // Ignore if lockfile cannot be removed
    }
  }

  try {
    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });
  } catch {
    // Fallback to an isolated temp directory if the persistent dbPath is locked by another process
    memoryServer = await MongoMemoryServer.create();
  }

  const uri = memoryServer.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return { mode: connectionMode };
  }

  if (env.mongoUri) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        family: 4,
      });
      connectionMode = 'atlas';
      lastAtlasError = null;
      console.log('[QuickFix DB] Connected to MongoDB Atlas via MONGODB_URI');
      return { mode: connectionMode };
    } catch (err) {
      lastAtlasError = err?.message || 'Unable to connect to MongoDB Atlas';
      console.log(
        '[QuickFix DB] MongoDB Atlas unreachable (verify 0.0.0.0/0 IP whitelist in Atlas Network Access). Falling back to local MongoDB preview instance.'
      );

      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
      }

      try {
        await startLocalPreviewMongo();
        connectionMode = 'local-preview-fallback';
        console.log('[QuickFix DB] Local MongoDB preview instance ready');
        return { mode: connectionMode, atlasFallback: true };
      } catch (fallbackErr) {
        connectionMode = 'atlas-disconnected';
        throw env.nodeEnv === 'production' ? err : fallbackErr;
      }
    }
  }

  if (env.nodeEnv === 'production') {
    connectionMode = 'unconfigured';
    throw new Error('MONGODB_URI must be set in production.');
  }

  await startLocalPreviewMongo();
  connectionMode = 'local-preview';
  console.log('[QuickFix DB] MONGODB_URI not configured; running persistent local MongoDB preview instance');
  return { mode: connectionMode };
}

export function initDatabaseOnce(seedFn) {
  if (!initPromise) {
    initPromise = (async () => {
      const result = await connectDatabase();
      if (seedFn) {
        await seedFn();
      }
      return result;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
