import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import healthRouter from './routes/health.js';
import booksRouter from './routes/books.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Basic security and parsing middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(':method :url :status :response-time ms'));
  }

  // Static web UI
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // Health and metrics routes
  app.use('/health', healthRouter);

  // API endpoints
  app.use('/api/books', booksRouter);

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
  });

  return app;
}

export default createApp;
