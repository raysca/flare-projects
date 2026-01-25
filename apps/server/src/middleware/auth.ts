import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '@linearflow/shared';
import type { Env } from '../lib/app';
import { getSession, touchSession } from '../services/session';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Auth middleware - verifies JWT token or session cookie
 * Requires authentication - returns 401 if not authenticated
 */
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  // Try JWT from Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, JWT_SECRET);

    if (payload) {
      c.set('user', {
        id: payload.sub,
        email: payload.email,
      });
      return next();
    }
  }

  // Try JWT from query param (for WebSocket connections)
  const queryToken = c.req.query('token');
  if (queryToken) {
    const payload = await verifyToken(queryToken, JWT_SECRET);

    if (payload) {
      c.set('user', {
        id: payload.sub,
        email: payload.email,
      });
      return next();
    }
  }

  // Try session cookie
  const sessionId = getCookie(c, 'sessionId');
  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      c.set('user', {
        id: session.userId,
        email: session.email,
      });
      c.set('sessionId', sessionId);

      // Update last accessed time asynchronously (don't wait)
      touchSession(sessionId).catch(console.error);

      return next();
    }
  }

  return c.json({ error: 'Unauthorized' }, 401);
});

/**
 * Optional auth middleware - adds user to context if authenticated
 * Does NOT require authentication - continues even if not authenticated
 */
export const optionalAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  // Try JWT from Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, JWT_SECRET);

    if (payload) {
      c.set('user', {
        id: payload.sub,
        email: payload.email,
      });
      return next();
    }
  }

  // Try JWT from query param (for WebSocket connections)
  const queryToken = c.req.query('token');
  if (queryToken) {
    const payload = await verifyToken(queryToken, JWT_SECRET);

    if (payload) {
      c.set('user', {
        id: payload.sub,
        email: payload.email,
      });
      return next();
    }
  }

  // Try session cookie
  const sessionId = getCookie(c, 'sessionId');
  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      c.set('user', {
        id: session.userId,
        email: session.email,
      });
      c.set('sessionId', sessionId);

      // Update last accessed time asynchronously (don't wait)
      touchSession(sessionId).catch(console.error);
    }
  }

  return next();
});

/**
 * Get authenticated user from context
 * Throws if user is not authenticated
 */
export function getAuthUser(c: { get: (key: 'user') => Env['Variables']['user'] }) {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
