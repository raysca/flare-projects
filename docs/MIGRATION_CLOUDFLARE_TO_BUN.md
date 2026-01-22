# Migration Strategy: Cloudflare to Bun

This document outlines the migration plan for moving the LinearFlow backend from Cloudflare Workers to a unified Bun full-stack server with native SQLite and WebSocket support.

## Current vs Target Architecture

| Component | Current (Cloudflare) | Target (Bun) |
|-----------|---------------------|--------------|
| Runtime | Cloudflare Workers | Bun |
| API Framework | Hono | Hono (unchanged) |
| Database | D1 (SQLite) | bun:sqlite |
| ORM | Drizzle | Drizzle (unchanged) |
| Real-time | Durable Objects | Bun WebSocket (built-in) |
| Sessions | KV Namespace | SQLite table |
| File Storage | R2 | Local filesystem or S3 |
| Queue | Cloudflare Queue | In-memory or BullMQ |
| Frontend | TanStack Start (apps/web) | Bun HTML imports (unified) |

## Key Architectural Changes

1. **Unified Full-Stack Server** - Single `apps/server` serves both API and React frontend
2. **Hono + Bun.serve()** - Hono handles API routing via Bun's fetch handler
3. **Bun-Native APIs** - `bun:sqlite`, built-in WebSocket, `Bun.file()`
4. **HTML Imports** - Frontend bundled automatically via Bun

## Migration Phases

- [Phase 1: Database Setup](#phase-1-database-setup)
- [Phase 2: API Routes Migration](#phase-2-api-routes-migration)
- [Phase 3: Session Management](#phase-3-session-management)
- [Phase 4: Real-time WebSocket](#phase-4-real-time-websocket)
- [Phase 5: Frontend Migration](#phase-5-frontend-migration)
- [Phase 6: File Storage](#phase-6-file-storage)
- [Phase 7: Queue System](#phase-7-queue-system)
- [Phase 8: Testing & Validation](#phase-8-testing--validation)
- [Phase 9: Cleanup](#phase-9-cleanup)

---

## Phase 1: Database Setup

### Task 1.1: Install dependencies
- [ ] Add Hono, Drizzle, and other dependencies:
  ```bash
  cd apps/server
  bun add hono @hono/zod-validator drizzle-orm zod
  bun add -d drizzle-kit
  ```

### Task 1.2: Create Bun SQLite client
- [ ] Create `apps/server/src/db/client.ts`:
  ```typescript
  import { drizzle } from 'drizzle-orm/bun-sqlite';
  import { Database } from 'bun:sqlite';
  import * as schema from '@linearflow/database/schema';

  const sqlite = new Database(process.env.DATABASE_URL || './data/linearflow.db');

  // Enable WAL mode for better concurrent performance
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  export const db = drizzle(sqlite, { schema });
  export type DB = typeof db;
  ```

### Task 1.3: Create data directory
- [ ] Create `apps/server/data/` directory
- [ ] Add `data/*.db` to `.gitignore`

### Task 1.4: Update Drizzle config for Bun
- [ ] Modify `packages/database/drizzle.config.ts`:
  ```typescript
  import { defineConfig } from 'drizzle-kit';

  export default defineConfig({
    schema: './src/schema/index.ts',
    out: './migrations',
    dialect: 'sqlite',
    dbCredentials: {
      url: process.env.DATABASE_URL || '../apps/server/data/linearflow.db',
    },
  });
  ```

### Task 1.5: Run migrations
- [ ] Generate migrations: `cd packages/database && bun run db:generate`
- [ ] Apply migrations: `cd packages/database && bun run db:push`

### Task 1.6: Update seed script for Bun
- [ ] Modify `packages/database/src/seed/index.ts` to accept Bun client
- [ ] Remove D1-specific batch size limits
- [ ] Test seeding: `bun run seed`

---

## Phase 2: API Routes Migration

### Task 2.1: Create route structure
- [ ] Create directory structure:
  ```
  apps/server/src/
  ├── routes/
  │   ├── auth.ts
  │   ├── users.ts
  │   ├── projects.ts
  │   ├── issues.ts
  │   ├── cycles.ts
  │   └── invitations.ts
  └── middleware/
      └── auth.ts
  ```

### Task 2.2: Create Hono app with context types
- [ ] Create `apps/server/src/lib/app.ts`:
  ```typescript
  import { Hono } from 'hono';
  import { cors } from 'hono/cors';
  import type { DB } from '../db/client';

  // App context types
  export type Env = {
    Variables: {
      db: DB;
      user?: {
        id: string;
        email: string;
      };
    };
  };

  export function createApp() {
    const app = new Hono<Env>();

    // Global middleware
    app.use('*', cors());

    return app;
  }

  export type AppType = ReturnType<typeof createApp>;
  ```

### Task 2.3: Create database middleware
- [ ] Create `apps/server/src/middleware/db.ts`:
  ```typescript
  import { createMiddleware } from 'hono/factory';
  import { db } from '../db/client';
  import type { Env } from '../lib/app';

  export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
    c.set('db', db);
    await next();
  });
  ```

### Task 2.4: Migrate auth routes
- [ ] Create `apps/server/src/routes/auth.ts`:
  ```typescript
  import { Hono } from 'hono';
  import { zValidator } from '@hono/zod-validator';
  import { z } from 'zod';
  import type { Env } from '../lib/app';
  import { users } from '@linearflow/database/schema';
  import { eq } from 'drizzle-orm';
  import { signJWT } from '../lib/jwt';
  import { createSession } from '../services/session';

  const auth = new Hono<Env>();

  const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  });

  auth.post('/signup', zValidator('json', signupSchema), async (c) => {
    const db = c.get('db');
    const { email, password, name } = c.req.valid('json');

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return c.json({ error: 'Email already registered' }, 400);
    }

    // Hash password and create user
    const passwordHash = await Bun.password.hash(password);
    const id = crypto.randomUUID();

    await db.insert(users).values({ id, email, name, passwordHash });

    const token = await signJWT({ sub: id, email, name });
    const sessionId = await createSession(id, email);

    return c.json({ user: { id, email, name }, token, sessionId });
  });

  auth.post('/login', zValidator('json', z.object({
    email: z.string().email(),
    password: z.string(),
  })), async (c) => {
    const db = c.get('db');
    const { email, password } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !await Bun.password.verify(password, user.passwordHash)) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = await signJWT({ sub: user.id, email: user.email, name: user.name });
    const sessionId = await createSession(user.id, user.email);

    return c.json({ user: { id: user.id, email: user.email, name: user.name }, token, sessionId });
  });

  auth.post('/logout', async (c) => {
    // Session deletion handled by middleware
    return c.json({ success: true });
  });

  auth.get('/me', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({ user });
  });

  export { auth };
  ```

### Task 2.5: Migrate users routes
- [ ] Create `apps/server/src/routes/users.ts`
- [ ] Copy from `apps/worker/src/routes/users.ts`
- [ ] Replace `c.env.DB` → `c.get('db')`
- [ ] Keep same Hono patterns

### Task 2.6: Migrate projects routes
- [ ] Create `apps/server/src/routes/projects.ts`
- [ ] Copy from `apps/worker/src/routes/projects.ts`
- [ ] Replace `c.env.DB` → `c.get('db')`

### Task 2.7: Migrate issues routes (without real-time)
- [ ] Create `apps/server/src/routes/issues.ts`
- [ ] Copy from `apps/worker/src/routes/issues.ts`
- [ ] Replace `c.env.DB` → `c.get('db')`
- [ ] Comment out Durable Object broadcasts (add in Phase 4)
- [ ] Remove `c.executionCtx.waitUntil()` calls

### Task 2.8: Migrate cycles routes
- [ ] Create `apps/server/src/routes/cycles.ts`
- [ ] Copy from `apps/worker/src/routes/cycles.ts`
- [ ] Replace `c.env.DB` → `c.get('db')`

### Task 2.9: Migrate invitations routes
- [ ] Create `apps/server/src/routes/invitations.ts`
- [ ] Copy from `apps/worker/src/routes/invitations.ts`
- [ ] Replace `c.env.DB` → `c.get('db')`

### Task 2.10: Migrate dev routes
- [ ] Create `apps/server/src/routes/dev.ts`
- [ ] Copy from `apps/worker/src/routes/dev.ts`
- [ ] Replace `c.env.DB` → `c.get('db')`

### Task 2.11: Create main Hono app
- [ ] Create `apps/server/src/app.ts`:
  ```typescript
  import { Hono } from 'hono';
  import { cors } from 'hono/cors';
  import { logger } from 'hono/logger';
  import type { Env } from './lib/app';
  import { dbMiddleware } from './middleware/db';
  import { authMiddleware } from './middleware/auth';
  import { auth } from './routes/auth';
  import { users } from './routes/users';
  import { projects } from './routes/projects';
  import { issues } from './routes/issues';
  import { cycles } from './routes/cycles';
  import { invitations } from './routes/invitations';
  import { dev } from './routes/dev';

  const app = new Hono<Env>();

  // Global middleware
  app.use('*', logger());
  app.use('*', cors());
  app.use('/api/*', dbMiddleware);

  // Health check
  app.get('/api/v1/health', (c) => c.json({ status: 'ok' }));

  // API routes
  app.route('/api/v1/auth', auth);
  app.use('/api/v1/*', authMiddleware); // Protect remaining routes
  app.route('/api/v1/users', users);
  app.route('/api/v1/projects', projects);
  app.route('/api/v1/issues', issues);
  app.route('/api/v1/cycles', cycles);
  app.route('/api/v1/invitations', invitations);

  // Dev routes (only in development)
  if (process.env.NODE_ENV !== 'production') {
    app.route('/api/dev', dev);
  }

  export { app };
  ```

### Task 2.12: Integrate Hono with Bun.serve()
- [ ] Update `apps/server/src/index.ts`:
  ```typescript
  import { serve } from 'bun';
  import { app } from './app';
  import index from './index.html';
  import { websocketHandlers } from './realtime/handlers';
  import { deleteExpiredSessions } from './services/session';

  const server = serve({
    port: process.env.PORT || 3001,

    // Hono handles API routes, fallback to frontend
    async fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade for /ws/* paths
      if (url.pathname.startsWith('/ws/')) {
        const upgraded = server.upgrade(req, {
          data: { url: url.pathname },
        });
        if (upgraded) return undefined;
        return new Response('WebSocket upgrade failed', { status: 500 });
      }

      // API routes handled by Hono
      if (url.pathname.startsWith('/api/')) {
        return app.fetch(req);
      }

      // Frontend routes - serve index.html
      return new Response(Bun.file('./src/index.html'));
    },

    websocket: websocketHandlers,

    development: process.env.NODE_ENV !== 'production' && {
      hmr: true,
      console: true,
    },
  });

  // Session cleanup interval
  setInterval(() => {
    deleteExpiredSessions().catch(console.error);
  }, 60 * 60 * 1000);

  console.log(`Server running at ${server.url}`);
  ```

---

## Phase 3: Session Management

### Task 3.1: Add sessions table to schema
- [ ] Create `packages/database/src/schema/sessions.ts`:
  ```typescript
  import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
  import { sql } from 'drizzle-orm';
  import { users } from './users';

  export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    projectId: text('project_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  });
  ```

### Task 3.2: Export sessions from schema index
- [ ] Add to `packages/database/src/schema/index.ts`:
  ```typescript
  export * from './sessions';
  ```

### Task 3.3: Create session service
- [ ] Create `apps/server/src/services/session.ts`:
  ```typescript
  import { db } from '../db/client';
  import { sessions } from '@linearflow/database/schema';
  import { eq, lt } from 'drizzle-orm';

  const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  export function generateSessionId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  export async function createSession(userId: string, email: string) {
    const id = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION);

    await db.insert(sessions).values({
      id,
      userId,
      email,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
    });

    return id;
  }

  export async function getSession(sessionId: string) {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await deleteSession(sessionId);
      return null;
    }
    return session;
  }

  export async function touchSession(sessionId: string) {
    await db.update(sessions)
      .set({ lastAccessedAt: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  export async function deleteSession(sessionId: string) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  export async function deleteExpiredSessions() {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }

  export async function deleteUserSessions(userId: string) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
  ```

### Task 3.4: Create auth middleware
- [ ] Create `apps/server/src/middleware/auth.ts`:
  ```typescript
  import { createMiddleware } from 'hono/factory';
  import type { Env } from '../lib/app';
  import { getSession } from '../services/session';
  import { verifyJWT } from '../lib/jwt';

  export const authMiddleware = createMiddleware<Env>(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    // Try JWT first
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await verifyJWT(token);
      if (payload) {
        c.set('user', {
          id: payload.sub as string,
          email: payload.email as string,
        });
        return next();
      }
    }

    // Try session from cookie
    const sessionId = c.req.cookie('sessionId');
    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        c.set('user', {
          id: session.userId,
          email: session.email,
        });
        return next();
      }
    }

    return c.json({ error: 'Unauthorized' }, 401);
  });

  // Optional auth - doesn't fail if no user
  export const optionalAuthMiddleware = createMiddleware<Env>(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await verifyJWT(token);
      if (payload) {
        c.set('user', {
          id: payload.sub as string,
          email: payload.email as string,
        });
      }
    } else {
      const sessionId = c.req.cookie('sessionId');
      if (sessionId) {
        const session = await getSession(sessionId);
        if (session) {
          c.set('user', {
            id: session.userId,
            email: session.email,
          });
        }
      }
    }

    return next();
  });
  ```

### Task 3.5: Create JWT utilities
- [ ] Create `apps/server/src/lib/jwt.ts`:
  ```typescript
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  const encoder = new TextEncoder();

  export async function signJWT(payload: Record<string, unknown>, expiresIn = '7d') {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = now + parseDuration(expiresIn);

    const fullPayload = { ...payload, iat: now, exp };

    const headerB64 = btoa(JSON.stringify(header));
    const payloadB64 = btoa(JSON.stringify(fullPayload));
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `${data}.${signatureB64}`;
  }

  export async function verifyJWT(token: string) {
    try {
      const [headerB64, payloadB64, signatureB64] = token.split('.');
      const data = `${headerB64}.${payloadB64}`;

      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
      );
      const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
      const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));

      if (!valid) return null;

      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;

      return payload;
    } catch {
      return null;
    }
  }

  function parseDuration(d: string): number {
    const match = d.match(/^(\d+)([smhd])$/);
    if (!match) return 0;
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(num) * multipliers[unit];
  }
  ```

### Task 3.6: Set up session cleanup interval
- [ ] Add to `apps/server/src/index.ts`:
  ```typescript
  import { deleteExpiredSessions } from './services/session';

  // Clean up expired sessions every hour
  setInterval(() => {
    deleteExpiredSessions().catch(console.error);
  }, 60 * 60 * 1000);
  ```

### Task 3.7: Generate and apply sessions migration
- [ ] Run `bun run db:generate`
- [ ] Run `bun run db:push`

---

## Phase 4: Real-time WebSocket

### Task 4.1: Create pub/sub manager
- [ ] Create `apps/server/src/realtime/pubsub.ts`:
  ```typescript
  import type { ServerWebSocket } from 'bun';

  export interface Subscriber {
    ws: ServerWebSocket<WebSocketData>;
    userId: string;
    userName: string;
    avatarUrl?: string;
    connectedAt: number;
  }

  export interface WebSocketData {
    id: string;
    userId: string;
    userName: string;
    avatarUrl?: string;
    channel: string;
  }

  class PubSubManager {
    private channels = new Map<string, Map<string, Subscriber>>();

    subscribe(channel: string, subscriber: Subscriber) {
      if (!this.channels.has(channel)) {
        this.channels.set(channel, new Map());
      }
      this.channels.get(channel)!.set(subscriber.ws.data.id, subscriber);
    }

    unsubscribe(channel: string, subscriberId: string) {
      this.channels.get(channel)?.delete(subscriberId);
      if (this.channels.get(channel)?.size === 0) {
        this.channels.delete(channel);
      }
    }

    publish(channel: string, message: object, excludeId?: string) {
      const subscribers = this.channels.get(channel);
      if (!subscribers) return;

      const payload = JSON.stringify(message);
      for (const [id, sub] of subscribers) {
        if (id !== excludeId) {
          sub.ws.send(payload);
        }
      }
    }

    getSubscribers(channel: string): Subscriber[] {
      return Array.from(this.channels.get(channel)?.values() || []);
    }
  }

  export const pubsub = new PubSubManager();
  ```

### Task 4.2: Create WebSocket message types
- [ ] Create `apps/server/src/realtime/types.ts`:
  ```typescript
  export interface WebSocketMessage {
    type: string;
    payload?: unknown;
    senderId?: string;
    timestamp?: number;
  }

  export interface UserPresence {
    userId: string;
    userName: string;
    avatarUrl?: string;
    connectedAt: number;
  }

  export type MessageType =
    | 'user_joined'
    | 'user_left'
    | 'current_users'
    | 'issue_updated'
    | 'issue_created'
    | 'issue_deleted'
    | 'comment_created'
    | 'comment_updated'
    | 'comment_deleted';
  ```

### Task 4.3: Create WebSocket handlers
- [ ] Create `apps/server/src/realtime/handlers.ts`:
  ```typescript
  import type { ServerWebSocket } from 'bun';
  import { pubsub, type WebSocketData, type Subscriber } from './pubsub';
  import type { WebSocketMessage, UserPresence } from './types';

  export const websocketHandlers = {
    open(ws: ServerWebSocket<WebSocketData>) {
      const { channel, userId, userName, avatarUrl } = ws.data;

      const subscriber: Subscriber = {
        ws,
        userId,
        userName,
        avatarUrl,
        connectedAt: Date.now(),
      };

      pubsub.subscribe(channel, subscriber);

      // Send current users to new connection
      const currentUsers: UserPresence[] = pubsub.getSubscribers(channel).map(s => ({
        userId: s.userId,
        userName: s.userName,
        avatarUrl: s.avatarUrl,
        connectedAt: s.connectedAt,
      }));

      ws.send(JSON.stringify({
        type: 'current_users',
        payload: currentUsers,
      }));

      // Notify others of new user
      pubsub.publish(channel, {
        type: 'user_joined',
        payload: { userId, userName, avatarUrl, connectedAt: subscriber.connectedAt },
      }, ws.data.id);
    },

    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      try {
        const data: WebSocketMessage = JSON.parse(message.toString());
        data.senderId = ws.data.userId;
        data.timestamp = Date.now();

        // Broadcast to all subscribers in channel
        pubsub.publish(ws.data.channel, data);
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    },

    close(ws: ServerWebSocket<WebSocketData>) {
      const { channel, userId, userName, avatarUrl } = ws.data;

      pubsub.unsubscribe(channel, ws.data.id);

      // Notify others of user leaving
      pubsub.publish(channel, {
        type: 'user_left',
        payload: { userId, userName, avatarUrl },
      });
    },
  };
  ```

### Task 4.4: Create WebSocket upgrade route
- [ ] Create `apps/server/src/routes/websocket.ts`:
  ```typescript
  import { verifyJWT } from '../lib/jwt';
  import type { WebSocketData } from '../realtime/pubsub';

  export async function handleWebSocketUpgrade(
    req: Request,
    server: ReturnType<typeof Bun.serve>
  ): Promise<Response | undefined> {
    const url = new URL(req.url);

    // Match /ws/:channel pattern
    const match = url.pathname.match(/^\/ws\/(.+)$/);
    if (!match) return undefined;

    const channel = match[1];
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    const wsData: WebSocketData = {
      id: crypto.randomUUID(),
      userId: payload.sub as string,
      userName: payload.name as string || 'Unknown',
      avatarUrl: payload.avatarUrl as string | undefined,
      channel,
    };

    const upgraded = server.upgrade(req, { data: wsData });
    if (!upgraded) {
      return Response.json({ error: 'WebSocket upgrade failed' }, { status: 500 });
    }

    return undefined; // Upgrade successful
  }
  ```

### Task 4.5: Integrate WebSocket into server
- [ ] Update `apps/server/src/index.ts`:
  ```typescript
  import { websocketHandlers } from './realtime/handlers';
  import { handleWebSocketUpgrade } from './routes/websocket';

  const server = serve({
    port: process.env.PORT || 3001,

    async fetch(req) {
      // Handle WebSocket upgrades first
      const wsResponse = await handleWebSocketUpgrade(req, server);
      if (wsResponse !== undefined) return wsResponse;

      // ... rest of routing
    },

    websocket: websocketHandlers,

    routes: {
      // ... existing routes
    },
  });
  ```

### Task 4.6: Create broadcast helpers
- [ ] Create `apps/server/src/realtime/broadcast.ts`:
  ```typescript
  import { pubsub } from './pubsub';
  import type { WebSocketMessage } from './types';

  export function broadcastToProject(projectId: string, message: WebSocketMessage) {
    pubsub.publish(`project:${projectId}`, {
      ...message,
      timestamp: Date.now(),
    });
  }

  export function broadcastToIssue(issueId: string, message: WebSocketMessage) {
    pubsub.publish(`issue:${issueId}`, {
      ...message,
      timestamp: Date.now(),
    });
  }
  ```

### Task 4.7: Update issues routes with broadcasts
- [ ] Import broadcast helpers in `apps/server/src/routes/issues.ts`
- [ ] Add broadcasts after issue updates:
  ```typescript
  // After updating an issue
  broadcastToProject(issue.projectId, {
    type: 'issue_updated',
    payload: { issue: updatedIssue },
  });

  broadcastToIssue(issueId, {
    type: 'issue_updated',
    payload: { issue: updatedIssue },
  });
  ```

---

## Phase 5: Frontend Migration

### Task 5.1: Decide migration approach
Choose one:
- [ ] **Option A**: Migrate existing `apps/web` components to `apps/server/src`
- [ ] **Option B**: Keep `apps/web` separate, use as API client only
- [ ] **Option C**: Gradually migrate, run both during transition

### Task 5.2: (Option A) Copy core components
- [ ] Copy from `apps/web/src/components/`:
  - `ui/` (shadcn components)
  - `issues/` (issue board, cards, columns)
  - Other shared components

### Task 5.3: Set up routing (if migrating frontend)
- [ ] Install client-side router:
  ```bash
  bun add @tanstack/react-router
  ```
- [ ] Create route definitions
- [ ] Set up route tree

### Task 5.4: Create API client
- [ ] Create `apps/server/src/lib/api.ts`:
  ```typescript
  const API_BASE = '/api/v1';

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  export const api = {
    auth: {
      login: (data: LoginInput) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
      signup: (data: SignupInput) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
      logout: () => request('/auth/logout', { method: 'POST' }),
      me: () => request('/auth/me'),
    },
    // ... other endpoints
  };
  ```

### Task 5.5: Set up React Query (if using)
- [ ] Install TanStack Query:
  ```bash
  bun add @tanstack/react-query
  ```
- [ ] Create query hooks

### Task 5.6: Update WebSocket client
- [ ] Create `apps/server/src/lib/websocket.ts`:
  ```typescript
  export function createWebSocket(channel: string, token: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/${channel}?token=${token}`;
    return new WebSocket(url);
  }
  ```

---

## Phase 6: File Storage

### Task 6.1: Create uploads directory
- [ ] Create `apps/server/data/uploads/`
- [ ] Add to `.gitignore`

### Task 6.2: Create file storage service
- [ ] Create `apps/server/src/services/storage.ts`:
  ```typescript
  import { join } from 'path';

  const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads';

  export async function saveFile(file: File, subdir?: string): Promise<string> {
    const id = crypto.randomUUID();
    const ext = file.name.split('.').pop() || '';
    const filename = `${id}${ext ? `.${ext}` : ''}`;
    const dir = subdir ? join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
    const path = join(dir, filename);

    await Bun.write(path, file);
    return filename;
  }

  export async function getFile(filename: string, subdir?: string): Promise<Blob | null> {
    const dir = subdir ? join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
    const path = join(dir, filename);
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    return file;
  }

  export async function deleteFile(filename: string, subdir?: string): Promise<void> {
    const dir = subdir ? join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
    const path = join(dir, filename);
    await Bun.file(path).delete();
  }

  export function getFileUrl(filename: string, subdir?: string): string {
    const path = subdir ? `${subdir}/${filename}` : filename;
    return `/api/v1/files/${path}`;
  }
  ```

### Task 6.3: Create file routes
- [ ] Create `apps/server/src/routes/files.ts`:
  ```typescript
  import { saveFile, getFile, deleteFile } from '../services/storage';
  import { requireAuth } from '../middleware/auth';

  export const fileRoutes = {
    '/api/v1/files/upload': {
      POST: requireAuth(async (req, user) => {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
          return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        const filename = await saveFile(file);
        return Response.json({ filename, url: `/api/v1/files/${filename}` });
      }),
    },

    '/api/v1/files/:filename': {
      async GET(req: Request) {
        const url = new URL(req.url);
        const filename = url.pathname.split('/').pop()!;
        const file = await getFile(filename);
        if (!file) {
          return Response.json({ error: 'Not found' }, { status: 404 });
        }
        return new Response(file);
      },
    },
  };
  ```

### Task 6.4: Update attachments to use local storage
- [ ] Replace R2 key references with local file paths
- [ ] Update URL generation

---

## Phase 7: Queue System

### Task 7.1: Create simple in-memory queue
- [ ] Create `apps/server/src/services/queue.ts`:
  ```typescript
  type JobHandler<T> = (data: T) => Promise<void>;

  interface Job<T = unknown> {
    id: string;
    type: string;
    data: T;
    createdAt: number;
    attempts: number;
  }

  class SimpleQueue {
    private jobs: Job[] = [];
    private handlers = new Map<string, JobHandler<unknown>>();
    private processing = false;

    register<T>(type: string, handler: JobHandler<T>) {
      this.handlers.set(type, handler as JobHandler<unknown>);
    }

    enqueue<T>(type: string, data: T) {
      this.jobs.push({
        id: crypto.randomUUID(),
        type,
        data,
        createdAt: Date.now(),
        attempts: 0,
      });
      this.process();
    }

    private async process() {
      if (this.processing) return;
      this.processing = true;

      while (this.jobs.length > 0) {
        const job = this.jobs.shift()!;
        const handler = this.handlers.get(job.type);

        if (handler) {
          try {
            await handler(job.data);
          } catch (err) {
            console.error(`Job ${job.id} failed:`, err);
            if (job.attempts < 3) {
              job.attempts++;
              this.jobs.push(job);
            }
          }
        }
      }

      this.processing = false;
    }
  }

  export const queue = new SimpleQueue();
  ```

### Task 7.2: Register job handlers
- [ ] Create `apps/server/src/jobs/index.ts`:
  ```typescript
  import { queue } from '../services/queue';

  // Email notifications
  queue.register('send_email', async (data: { to: string; subject: string; body: string }) => {
    // Implement email sending
    console.log('Sending email:', data);
  });

  // Other async tasks
  queue.register('process_webhook', async (data: { url: string; payload: unknown }) => {
    // Implement webhook delivery
  });
  ```

### Task 7.3: Initialize queue on server start
- [ ] Import jobs in `apps/server/src/index.ts`:
  ```typescript
  import './jobs';
  ```

---

## Phase 8: Testing & Validation

### Task 8.1: Set up test environment
- [ ] Create `apps/server/src/test/setup.ts`:
  ```typescript
  import { Database } from 'bun:sqlite';
  import { drizzle } from 'drizzle-orm/bun-sqlite';
  import * as schema from '@linearflow/database/schema';

  export function createTestDb() {
    const sqlite = new Database(':memory:');
    return drizzle(sqlite, { schema });
  }
  ```

### Task 8.2: Test database operations
- [ ] Create tests for CRUD operations
- [ ] Test foreign key constraints
- [ ] Test migrations

### Task 8.3: Test API endpoints
- [ ] Test auth routes (signup, login, logout, me)
- [ ] Test user routes
- [ ] Test project routes with member access
- [ ] Test issue routes with activity logging
- [ ] Test cycle routes
- [ ] Test invitation routes

### Task 8.4: Test WebSocket functionality
- [ ] Test connection/disconnection
- [ ] Test user presence updates
- [ ] Test message broadcasting
- [ ] Test multiple channels

### Task 8.5: Test session management
- [ ] Test session creation
- [ ] Test session retrieval
- [ ] Test session expiration
- [ ] Test cleanup job

### Task 8.6: Integration tests
- [ ] Test complete user flows
- [ ] Test real-time updates end-to-end

### Task 8.7: Performance testing
- [ ] Load test API endpoints
- [ ] Test concurrent WebSocket connections
- [ ] Verify SQLite WAL performance

---

## Phase 9: Cleanup

### Task 9.1: Remove Cloudflare Worker
- [ ] Archive `apps/worker` if needed for reference
- [ ] Delete `apps/worker` directory

### Task 9.2: Remove Cloudflare dependencies from database package
- [ ] Update `packages/database/package.json`:
  - Remove `@cloudflare/workers-types`
- [ ] Delete `packages/database/src/client.ts` (D1 client)

### Task 9.3: Remove shared KV session code
- [ ] Delete `packages/shared/src/auth/session.ts`

### Task 9.4: Decide on apps/web
- [ ] **If migrated**: Delete `apps/web` directory
- [ ] **If keeping separate**: Update to point to new API

### Task 9.5: Update root configuration
- [ ] Update root `package.json` scripts:
  ```json
  {
    "scripts": {
      "dev": "bun --hot apps/server/src/index.ts",
      "build": "bun apps/server/build.ts",
      "start": "NODE_ENV=production bun apps/server/src/index.ts",
      "db:generate": "cd packages/database && bun run db:generate",
      "db:push": "cd packages/database && bun run db:push"
    }
  }
  ```

### Task 9.6: Update CLAUDE.md
- [ ] Update build commands
- [ ] Update architecture description
- [ ] Document new environment variables

### Task 9.7: Clean up unused files
- [ ] Remove `wrangler.toml`
- [ ] Remove Cloudflare-specific type definitions
- [ ] Run linter: `bun lint`
- [ ] Run type-check: `bun run type-check`

### Task 9.8: Update .gitignore
- [ ] Add `apps/server/data/`
- [ ] Add `apps/server/dist/`

---

## Final Directory Structure

```
flare-projects/
├── apps/
│   └── server/                      # Unified Bun full-stack server
│       ├── src/
│       │   ├── index.ts             # Entry point with Bun.serve()
│       │   ├── app.ts               # Hono app with all routes
│       │   ├── index.html           # Frontend HTML entry
│       │   ├── index.css            # Global styles
│       │   ├── frontend.tsx         # React app entry
│       │   ├── App.tsx              # Root component
│       │   ├── components/          # React components
│       │   │   └── ui/              # shadcn components
│       │   ├── routes/              # Hono route handlers
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   ├── projects.ts
│       │   │   ├── issues.ts
│       │   │   ├── cycles.ts
│       │   │   ├── invitations.ts
│       │   │   ├── files.ts
│       │   │   └── dev.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts          # Hono auth middleware
│       │   │   └── db.ts            # Hono db middleware
│       │   ├── services/
│       │   │   ├── session.ts
│       │   │   ├── storage.ts
│       │   │   └── queue.ts
│       │   ├── realtime/
│       │   │   ├── pubsub.ts
│       │   │   ├── handlers.ts      # Bun WebSocket handlers
│       │   │   ├── broadcast.ts
│       │   │   └── types.ts
│       │   ├── db/
│       │   │   └── client.ts        # bun:sqlite + Drizzle
│       │   ├── lib/
│       │   │   ├── app.ts           # Hono types & factory
│       │   │   ├── jwt.ts
│       │   │   └── utils.ts
│       │   └── jobs/
│       │       └── index.ts
│       ├── data/                     # SQLite database & uploads
│       │   ├── linearflow.db
│       │   └── uploads/
│       ├── build.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── database/
│   │   ├── src/
│   │   │   ├── schema/              # Drizzle schemas
│   │   │   └── seed/                # Seed data
│   │   ├── migrations/
│   │   └── drizzle.config.ts
│   └── shared/                       # Shared types only
└── docs/
    └── MIGRATION_CLOUDFLARE_TO_BUN.md
```

---

## Environment Variables

```env
# apps/server/.env

# Database
DATABASE_URL=./data/linearflow.db

# Authentication
JWT_SECRET=your-production-secret-here

# Server
PORT=3001
NODE_ENV=development

# File Storage
UPLOAD_DIR=./data/uploads
```

---

## Key API Patterns

### Hono Route Migration (Minimal Changes)

Hono routes stay almost identical. The only change is how you access the database:

**Before (Cloudflare Workers):**
```typescript
app.get('/users/:id', async (c) => {
  const db = createDrizzleClient(c.env.DB);  // From Cloudflare binding
  const id = c.req.param('id');
  const user = await db.select().from(users).where(eq(users.id, id));
  return c.json(user);
});
```

**After (Bun):**
```typescript
app.get('/users/:id', async (c) => {
  const db = c.get('db');  // From Hono context (set by middleware)
  const id = c.req.param('id');
  const user = await db.select().from(users).where(eq(users.id, id));
  return c.json(user);
});
```

### Session Migration (KV → SQLite)

**Before (Cloudflare KV):**
```typescript
await kv.put(`session:${sessionId}`, JSON.stringify(session), {
  expirationTtl: SESSION_DURATION,
});
const data = await kv.get(`session:${sessionId}`);
```

**After (SQLite via Drizzle):**
```typescript
await db.insert(sessions).values({ id, userId, email, expiresAt });
const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
```

### Durable Objects → Bun WebSocket Conversion

**Before (Durable Objects):**
```typescript
async function broadcastToProject(c: Context, projectId: string, message: object) {
  const id = c.env.WORKSPACE_DO.idFromName(projectId);
  const stub = c.env.WORKSPACE_DO.get(id);
  c.executionCtx.waitUntil(stub.fetch('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify(message),
  }));
}
```

**After (Bun Pub/Sub):**
```typescript
function broadcastToProject(projectId: string, message: object) {
  pubsub.publish(`project:${projectId}`, message);
}
```

### Password Hashing

**Before (manual with Web Crypto):**
```typescript
const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password + salt));
```

**After (Bun built-in):**
```typescript
const hash = await Bun.password.hash(password);
const valid = await Bun.password.verify(password, hash);
```

---

## Rollback Plan

1. Keep `apps/worker` until Phase 9
2. Test thoroughly before cleanup
3. Database schema is compatible - can revert to D1 if needed
4. Export SQLite data before any destructive changes
