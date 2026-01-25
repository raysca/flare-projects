import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './lib/app';
import { dbMiddleware } from './middleware/db';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import projectsRoutes from './routes/projects';
import issuesRoutes from './routes/issues';
import cyclesRoutes from './routes/cycles';
import invitationsRoutes from './routes/invitations';
import devRoutes from './routes/dev';

// Create main API app
const api = new Hono<Env>();

// Global middleware
api.use('*', logger());
api.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

// Database middleware for all routes
api.use('*', dbMiddleware);

// Health check
api.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
api.route('/auth', authRoutes);
api.route('/users', usersRoutes);
api.route('/projects', projectsRoutes);
api.route('/issues', issuesRoutes);
api.route('/cycles', cyclesRoutes);
api.route('/invitations', invitationsRoutes);

// Dev routes (development only)
if (process.env.NODE_ENV !== 'production') {
  api.route('/dev', devRoutes);
}

// 404 handler
api.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Error handler
api.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

export default api;
