import http from 'http';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { env } from './server/config/env.js';
import { initDatabaseOnce } from './server/config/db.js';
import { seedDemoDataIfEmpty } from './server/seed/seed.js';
import { createApiApp } from './server/app.js';
import { initSocketServer } from './server/realtime/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createApiApp();
  const httpServer = http.createServer(app);

  // Attach authenticated Socket.IO server before Vite/SPA middleware
  initSocketServer(httpServer);

  if (env.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Bind port immediately so container pre-warming succeeds without waiting on external Atlas timeouts
  httpServer.listen(env.port, '0.0.0.0', () => {
    console.log(`[QuickFix] Server running at http://0.0.0.0:${env.port}`);

    initDatabaseOnce(seedDemoDataIfEmpty).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        '[QuickFix] Database initialization warning (server remains up; check Atlas IP whitelist 0.0.0.0/0):',
        message
      );
    });
  });
}

startServer().catch((err) => {
  console.error('[QuickFix] Fatal startup error:', err);
  process.exit(1);
});
