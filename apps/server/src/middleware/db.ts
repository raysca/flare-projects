import { createMiddleware } from 'hono/factory';
import { db } from '../db/client';
import type { Env } from '../lib/app';

/**
 * Database middleware - adds db instance to context
 */
export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  c.set('db', db);
  await next();
});
