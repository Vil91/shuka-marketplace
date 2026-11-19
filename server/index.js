import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { getDb, runMigrations, closeDb, UPLOADS_DIR, ensureDataDirs } from './db.js';
import { AppError, sendError } from './lib/constants.js';
import { attachUser } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import sellerRoutes from './routes/seller.js';
import { seedIfEmpty } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.resolve(__dirname, '..', 'client', 'dist');

export async function createApp() {
  ensureDataDirs();
  const db = getDb();
  runMigrations(db);
  await seedIfEmpty(db);

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(attachUser);

  // Healthcheck for Render / uptime monitors
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'shuka' });
  });

  // Uploaded product images (thumbnails & large versions)
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '1d',
    })
  );

  // REST JSON API
  app.use('/api', authRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api', cartRoutes);
  app.use('/api', ordersRoutes);
  app.use('/api', sellerRoutes);

  // Unknown /api/* routes return JSON 404
  app.use('/api', (_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'API endpoint not found'));
  });

  // Serve built React frontend from the same single server process
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST, { maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        return res.sendFile('index.html', { root: CLIENT_DIST });
      }
      next();
    });
  } else {
    app.get('/', (_req, res) => {
      res.send('Shuka API running. Build client with `npm run build:client` to serve UI.');
    });
  }

  // Uniform JSON error handler
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) {
      return sendError(res, err.status, err.code, err.message, err.details);
    }
    if (err?.type === 'entity.parse.failed') {
      return sendError(res, 400, 'INVALID_JSON', 'Malformed JSON request body');
    }
    console.error('[Shuka Error]', err);
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected server error occurred');
  });

  return app;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  const app = await createApp();
  const server = app.listen(port, host, () => {
    console.log(`Shuka marketplace running on http://localhost:${port} (bound ${host}:${port})`);
  });

  const shutdown = () => {
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
