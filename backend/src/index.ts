import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import importRoutes from './routes/import';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}));

// Health check
app.get('/', (c) => c.json({
  service: 'stax-api',
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// Routes
app.route('/import', importRoutes);

// Start server
const port = parseInt(process.env.PORT || '4000');

console.log(`🚀 stax-api running on port ${port}`);

serve({ fetch: app.fetch, port });
