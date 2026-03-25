import 'dotenv/config';

// Catch unhandled errors so they appear in Railway logs
process.on('unhandledRejection', (err) => console.error('[UNHANDLED REJECTION]', err));
process.on('uncaughtException', (err) => console.error('[UNCAUGHT EXCEPTION]', err));
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

// Startup diagnostics
console.log(`🚀 stax-api running on port ${port}`);
console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ set' : '✗ MISSING'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ set' : '✗ MISSING'}`);
console.log(`   GOOGLE_GENAI_API_KEY: ${process.env.GOOGLE_GENAI_API_KEY ? '✓ set' : '✗ MISSING'}`);
console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ set' : '✗ MISSING'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || '(not set)'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`);

serve({ fetch: app.fetch, port });
