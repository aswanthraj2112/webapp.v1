import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config.js';
import { initDb } from './db.js';
import authRoutes from './auth/auth.routes.js';
import videoRoutes from './videos/video.routes.js';
import { errorHandler, NotFoundError } from './utils/errors.js';
import { ensureStorageDirs } from './videos/video.controller.js';

const app = express();

app.use(cors({
  origin: config.CLIENT_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for local development
if (config.USE_LOCAL_STORAGE) {
  app.use('/static/videos', express.static(config.PUBLIC_VIDEOS_DIR));
  app.use('/static/thumbs', express.static(config.PUBLIC_THUMBS_DIR));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

app.use((req, res, next) => {
  next(new NotFoundError('Route not found'));
});

app.use(errorHandler);

const start = async () => {
  await ensureStorageDirs();
  await initDb();
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${config.PORT}`);
    console.log(`Available at: http://n11817143-videoapp.cab432.com`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
