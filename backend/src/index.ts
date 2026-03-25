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
  origin: (origin) => {
    // Allow localhost dev
    if (origin?.startsWith('http://localhost')) return origin;
    // Allow configured frontend URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return origin;
    // Allow any Vercel deployment (preview + production)
    if (origin?.endsWith('.vercel.app')) return origin;
    // Allow any custom domain you might add
    if (origin?.endsWith('.stax.co.il')) return origin;
    return '';
  },
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
