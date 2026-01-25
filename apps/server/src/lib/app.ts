import { Hono } from 'hono';
import type { DB } from '../db/client';

/**
 * App environment/context types for Hono
 */
export type Env = {
  Variables: {
    db: DB;
    user?: {
      id: string;
      email: string;
      name?: string;
    };
    sessionId?: string;
  };
};

/**
 * Create a new Hono app instance with typed context
 */
export function createApp() {
  return new Hono<Env>();
}

export type AppType = ReturnType<typeof createApp>;
