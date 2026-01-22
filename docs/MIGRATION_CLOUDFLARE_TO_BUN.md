# Migration Strategy: Cloudflare to Bun

This document outlines the migration plan for moving the LinearFlow backend from Cloudflare Workers to a Bun-based server with native SQLite and WebSocket support.

## Current Architecture

| Component | Current (Cloudflare) | Target (Bun) |
|-----------|---------------------|--------------|
| Runtime | Cloudflare Workers | Bun |
| Framework | Hono | Hono (unchanged) |
| Database | D1 (SQLite) | Bun SQLite |
| ORM | Drizzle | Drizzle (unchanged) |
| Real-time | Durable Objects (WebSocket) | Bun WebSocket + Pub/Sub |
| Sessions | KV Namespace | SQLite or Redis |
| File Storage | R2 | Local filesystem or S3 |
| Queue | Cloudflare Queue | BullMQ or in-memory |

## Migration Phases

- [Phase 1: Project Setup](#phase-1-project-setup)
- [Phase 2: Database Migration](#phase-2-database-migration)
- [Phase 3: Session Management](#phase-3-session-management)
- [Phase 4: API Routes Migration](#phase-4-api-routes-migration)
- [Phase 5: Real-time WebSocket](#phase-5-real-time-websocket)
- [Phase 6: File Storage](#phase-6-file-storage)
- [Phase 7: Queue System](#phase-7-queue-system)
- [Phase 8: Testing & Validation](#phase-8-testing--validation)
- [Phase 9: Cleanup](#phase-9-cleanup)

---

## Phase 1: Project Setup

### Task 1.1: Create new Bun server package
- [ ] Create `apps/server` directory
- [ ] Initialize with `bun init`
- [ ] Add dependencies:
  ```bash
  bun add hono drizzle-orm better-sqlite3 @hono/zod-validator zod jose
  bun add -d @types/better-sqlite3 typescript
  ```

### Task 1.2: Configure TypeScript
- [ ] Create `tsconfig.json` extending root config
- [ ] Configure path aliases (`@/` → `src/`)
- [ ] Set target to `esnext` for Bun compatibility

### Task 1.3: Create environment configuration
- [ ] Create `.env` file structure:
  ```env
  DATABASE_URL=./data/linearflow.db
  JWT_SECRET=your-secret-here
  PORT=3001
  ENVIRONMENT=development
  ```
- [ ] Create `src/env.ts` for type-safe env access:
  ```typescript
  export const env = {
    DATABASE_URL: process.env.DATABASE_URL || './data/linearflow.db',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
    PORT: parseInt(process.env.PORT || '3001'),
    ENVIRONMENT: process.env.ENVIRONMENT || 'development',
  }
  ```

### Task 1.4: Create Bun server entry point
- [ ] Create `src/index.ts` with Hono app
- [ ] Configure CORS middleware
- [ ] Add health check endpoint
- [ ] Set up graceful shutdown

---

## Phase 2: Database Migration

### Task 2.1: Update Drizzle configuration
- [ ] Modify `packages/database/drizzle.config.ts`:
  ```typescript
  import { defineConfig } from "drizzle-kit";

  export default defineConfig({
    schema: "./src/schema/index.ts",
    out: "./migrations",
    dialect: "sqlite",
    dbCredentials: {
      url: process.env.DATABASE_URL || "./data/linearflow.db",
    },
  });
  ```

### Task 2.2: Create new database client
- [ ] Create `packages/database/src/bun-client.ts`:
  ```typescript
  import { drizzle } from 'drizzle-orm/bun-sqlite';
  import { Database } from 'bun:sqlite';
  import * as schema from './schema';

  export function createBunDrizzleClient(dbPath: string) {
    const sqlite = new Database(dbPath);
    sqlite.exec("PRAGMA journal_mode = WAL;");
    sqlite.exec("PRAGMA foreign_keys = ON;");
    return drizzle(sqlite, { schema });
  }

  export type BunDrizzleClient = ReturnType<typeof createBunDrizzleClient>;
  ```

### Task 2.3: Update package exports
- [ ] Add Bun client export to `packages/database/src/index.ts`
- [ ] Keep D1 client for backwards compatibility during migration

### Task 2.4: Generate and apply migrations
- [ ] Run `bun run db:generate` to create migration files
- [ ] Create `data/` directory for SQLite database
- [ ] Run migrations with `bun run db:push`

### Task 2.5: Update seed script
- [ ] Modify `packages/database/src/seed/index.ts` to use Bun client
- [ ] Remove D1-specific batch size limits (Bun SQLite handles larger batches)
- [ ] Test seeding with `bun run seed`

---

## Phase 3: Session Management

### Task 3.1: Create SQLite session store
- [ ] Add `sessions` table to schema:
  ```typescript
  // packages/database/src/schema/sessions.ts
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

### Task 3.2: Create session service
- [ ] Create `apps/server/src/services/session.ts`:
  ```typescript
  export class SessionService {
    constructor(private db: BunDrizzleClient) {}

    async createSession(userId: string, email: string): Promise<string>
    async getSession(sessionId: string): Promise<Session | null>
    async touchSession(sessionId: string): Promise<void>
    async deleteSession(sessionId: string): Promise<void>
    async deleteExpiredSessions(): Promise<void>
    async deleteUserSessions(userId: string): Promise<void>
  }
  ```

### Task 3.3: Add session cleanup job
- [ ] Create cleanup interval (runs every hour)
- [ ] Delete sessions where `expiresAt < now()`

### Task 3.4: Update auth middleware
- [ ] Copy `apps/worker/src/middleware/auth.ts` to `apps/server/src/middleware/`
- [ ] Replace KV session calls with SessionService
- [ ] Keep JWT verification unchanged (uses standard Web Crypto)

---

## Phase 4: API Routes Migration

### Task 4.1: Create app context type
- [ ] Create `apps/server/src/types.ts`:
  ```typescript
  import type { BunDrizzleClient } from '@linearflow/database';
  import type { SessionService } from './services/session';

  export type AppContext = {
    Variables: {
      user: { id: string; email: string };
      db: BunDrizzleClient;
      sessionService: SessionService;
    };
  };
  ```

### Task 4.2: Migrate auth routes
- [ ] Copy `apps/worker/src/routes/auth.ts` to `apps/server/src/routes/`
- [ ] Replace `c.env.DB` with `c.get('db')`
- [ ] Replace `c.env.KV` session calls with `c.get('sessionService')`
- [ ] Remove `executionCtx.waitUntil()` calls (not needed in Bun)

### Task 4.3: Migrate users routes
- [ ] Copy `apps/worker/src/routes/users.ts`
- [ ] Replace `c.env.DB` with `c.get('db')`
- [ ] No other Cloudflare-specific changes needed

### Task 4.4: Migrate projects routes
- [ ] Copy `apps/worker/src/routes/projects.ts`
- [ ] Replace `c.env.DB` with `c.get('db')`
- [ ] No other Cloudflare-specific changes needed

### Task 4.5: Migrate issues routes
- [ ] Copy `apps/worker/src/routes/issues.ts`
- [ ] Replace `c.env.DB` with `c.get('db')`
- [ ] Replace Durable Object broadcasts with Bun pub/sub (Phase 5)
- [ ] Temporarily comment out real-time broadcasts

### Task 4.6: Migrate cycles routes
- [ ] Copy `apps/worker/src/routes/cycles.ts`
- [ ] Replace `c.env.DB` with `c.get('db')`

### Task 4.7: Migrate invitations routes
- [ ] Copy `apps/worker/src/routes/invitations.ts`
- [ ] Replace `c.env.DB` with `c.get('db')`

### Task 4.8: Migrate dev routes
- [ ] Copy `apps/worker/src/routes/dev.ts`
- [ ] Replace `c.env.DB` with `c.get('db')`
- [ ] Update seed/reset to use Bun client

---

## Phase 5: Real-time WebSocket

### Task 5.1: Create pub/sub manager
- [ ] Create `apps/server/src/realtime/pubsub.ts`:
  ```typescript
  type Subscriber = {
    ws: ServerWebSocket<WebSocketData>;
    userId: string;
    userName: string;
    avatarUrl?: string;
    connectedAt: number;
  };

  class PubSubManager {
    private channels: Map<string, Map<string, Subscriber>> = new Map();

    subscribe(channel: string, subscriberId: string, subscriber: Subscriber): void
    unsubscribe(channel: string, subscriberId: string): void
    publish(channel: string, message: any, excludeId?: string): void
    getSubscribers(channel: string): Subscriber[]
  }

  export const pubsub = new PubSubManager();
  ```

### Task 5.2: Create WebSocket handler
- [ ] Create `apps/server/src/realtime/websocket.ts`:
  ```typescript
  import type { ServerWebSocket } from 'bun';

  export interface WebSocketData {
    userId: string;
    userName: string;
    avatarUrl?: string;
    channel: string;  // e.g., "project:123" or "issue:456"
    connectedAt: number;
  }

  export const websocketHandler = {
    open(ws: ServerWebSocket<WebSocketData>) {
      // Subscribe to channel
      // Broadcast user_joined
      // Send current_users to new connection
    },
    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      // Parse message
      // Broadcast to channel
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      // Unsubscribe from channel
      // Broadcast user_left
    },
  };
  ```

### Task 5.3: Integrate WebSocket with Bun server
- [ ] Update `apps/server/src/index.ts`:
  ```typescript
  Bun.serve({
    port: env.PORT,
    fetch: app.fetch,
    websocket: websocketHandler,
  });
  ```

### Task 5.4: Create WebSocket upgrade endpoint
- [ ] Add `/ws/:channel` route for WebSocket upgrades
- [ ] Validate JWT token from query parameter
- [ ] Call `server.upgrade(request, { data: wsData })`

### Task 5.5: Create broadcast helpers
- [ ] Create `apps/server/src/realtime/broadcast.ts`:
  ```typescript
  export function broadcastToProject(projectId: string, message: WebSocketMessage) {
    pubsub.publish(`project:${projectId}`, message);
  }

  export function broadcastToIssue(issueId: string, message: WebSocketMessage) {
    pubsub.publish(`issue:${issueId}`, message);
  }
  ```

### Task 5.6: Update issues routes with broadcasts
- [ ] Import broadcast helpers
- [ ] Replace Durable Object broadcasts with pub/sub broadcasts
- [ ] Test real-time updates

---

## Phase 6: File Storage

### Task 6.1: Create file storage service
- [ ] Create `apps/server/src/services/storage.ts`:
  ```typescript
  export class FileStorageService {
    constructor(private basePath: string) {}

    async upload(file: File, path: string): Promise<string>
    async download(path: string): Promise<Blob | null>
    async delete(path: string): Promise<void>
    async getUrl(path: string): string
  }
  ```

### Task 6.2: Create uploads directory structure
- [ ] Create `data/uploads/` directory
- [ ] Add to `.gitignore`

### Task 6.3: Add file upload endpoints
- [ ] Create `apps/server/src/routes/files.ts`
- [ ] Implement multipart form upload handling
- [ ] Generate unique file paths with UUIDs
- [ ] Return signed URLs or direct paths

### Task 6.4: Update attachments schema usage
- [ ] Replace `r2Key` references with local file paths
- [ ] Update URL generation logic

---

## Phase 7: Queue System

### Task 7.1: Create in-memory queue (simple)
- [ ] Create `apps/server/src/services/queue.ts`:
  ```typescript
  type Job<T> = {
    id: string;
    type: string;
    data: T;
    createdAt: number;
  };

  class SimpleQueue {
    private jobs: Job<any>[] = [];
    private handlers: Map<string, (data: any) => Promise<void>> = new Map();

    register(type: string, handler: (data: any) => Promise<void>): void
    enqueue<T>(type: string, data: T): void
    process(): Promise<void>
  }

  export const queue = new SimpleQueue();
  ```

### Task 7.2: Set up queue processing interval
- [ ] Process queue every 5 seconds
- [ ] Handle job failures with retry logic

### Task 7.3: (Optional) BullMQ integration
- [ ] Install `bullmq` and `ioredis`
- [ ] Create Redis-backed queue for production
- [ ] Configure workers for async processing

---

## Phase 8: Testing & Validation

### Task 8.1: Create test database
- [ ] Set up separate test database path
- [ ] Create test fixtures

### Task 8.2: Test all API endpoints
- [ ] Auth: signup, login, logout, me
- [ ] Users: list, get, update
- [ ] Projects: CRUD, members
- [ ] Issues: CRUD, status changes, activity
- [ ] Cycles: CRUD
- [ ] Invitations: create, accept

### Task 8.3: Test real-time features
- [ ] WebSocket connection
- [ ] User presence (join/leave)
- [ ] Issue update broadcasts
- [ ] Project-level broadcasts

### Task 8.4: Test session management
- [ ] Session creation
- [ ] Session validation
- [ ] Session expiration
- [ ] Session cleanup

### Task 8.5: Performance testing
- [ ] Load test API endpoints
- [ ] Test concurrent WebSocket connections
- [ ] Verify SQLite WAL mode performance

### Task 8.6: Update web app API client
- [ ] Update base URL configuration
- [ ] Test WebSocket connection from frontend
- [ ] Verify all features work end-to-end

---

## Phase 9: Cleanup

### Task 9.1: Remove Cloudflare dependencies
- [ ] Remove from `apps/worker/package.json`:
  - `@cloudflare/ai`
  - `@cloudflare/workers-types`
  - `wrangler`

### Task 9.2: Remove Cloudflare configuration
- [ ] Delete `apps/worker/wrangler.toml`
- [ ] Remove D1 database references

### Task 9.3: Update database package
- [ ] Remove D1 client (`packages/database/src/client.ts`)
- [ ] Update `drizzle.config.ts` to remove D1-HTTP driver
- [ ] Remove `@cloudflare/workers-types` from devDependencies

### Task 9.4: Remove shared KV session code
- [ ] Delete or archive `packages/shared/src/auth/session.ts`
- [ ] Remove KVNamespace type references

### Task 9.5: Delete old worker directory
- [ ] Archive `apps/worker` if needed for reference
- [ ] Delete `apps/worker` directory

### Task 9.6: Update monorepo configuration
- [ ] Update root `package.json` scripts
- [ ] Update `bun.lockb` with new dependencies
- [ ] Update CI/CD pipelines

### Task 9.7: Update documentation
- [ ] Update `CLAUDE.md` with new commands
- [ ] Update `README.md` with new architecture
- [ ] Document new environment variables

### Task 9.8: Final cleanup
- [ ] Remove unused type definitions
- [ ] Clean up import statements
- [ ] Run linter and fix issues
- [ ] Run type-check and fix issues

---

## Directory Structure (Target)

```
flare-projects/
├── apps/
│   ├── server/                    # NEW: Bun server
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point
│   │   │   ├── env.ts             # Environment config
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # Auth middleware
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── issues.ts
│   │   │   │   ├── cycles.ts
│   │   │   │   ├── invitations.ts
│   │   │   │   ├── files.ts       # NEW
│   │   │   │   └── dev.ts
│   │   │   ├── services/
│   │   │   │   ├── session.ts     # NEW: SQLite sessions
│   │   │   │   ├── storage.ts     # NEW: File storage
│   │   │   │   └── queue.ts       # NEW: Job queue
│   │   │   ├── realtime/
│   │   │   │   ├── pubsub.ts      # NEW: Pub/sub manager
│   │   │   │   ├── websocket.ts   # NEW: WebSocket handler
│   │   │   │   └── broadcast.ts   # NEW: Broadcast helpers
│   │   │   └── types.ts
│   │   ├── data/                   # SQLite database & uploads
│   │   │   ├── linearflow.db
│   │   │   └── uploads/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                        # Frontend (unchanged)
├── packages/
│   ├── database/
│   │   ├── src/
│   │   │   ├── schema/             # Unchanged
│   │   │   ├── bun-client.ts       # NEW: Bun SQLite client
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   └── drizzle.config.ts       # Updated for Bun
│   └── shared/                     # Types only
└── docs/
    └── MIGRATION_CLOUDFLARE_TO_BUN.md
```

---

## Environment Variables (Target)

```env
# apps/server/.env

# Database
DATABASE_URL=./data/linearflow.db

# Authentication
JWT_SECRET=your-production-secret-here

# Server
PORT=3001
ENVIRONMENT=production

# File Storage (optional: for S3 in production)
# STORAGE_TYPE=local|s3
# S3_BUCKET=your-bucket
# S3_REGION=us-east-1
# S3_ACCESS_KEY=xxx
# S3_SECRET_KEY=xxx

# Queue (optional: for Redis in production)
# REDIS_URL=redis://localhost:6379
```

---

## Rollback Plan

If issues arise during migration:

1. **Keep worker code intact** until Phase 9
2. **Use feature flags** to switch between backends
3. **Maintain database compatibility** - schema is identical
4. **Export data** from D1 before Phase 9 cleanup

---

## Notes

### Unchanged Components
- Hono framework and route structure
- Drizzle ORM and schema definitions
- JWT authentication logic
- Zod validation schemas
- Frontend (apps/web)

### Key Differences
| Feature | Cloudflare | Bun |
|---------|-----------|-----|
| Database access | `c.env.DB` | `c.get('db')` |
| Sessions | KV with TTL | SQLite with cleanup job |
| WebSocket | Durable Objects | Bun native WebSocket |
| Background tasks | `waitUntil()` | Direct async or queue |
| File storage | R2 | Local filesystem or S3 |

### Performance Considerations
- Enable SQLite WAL mode for concurrent reads
- Use connection pooling if needed
- Consider Redis for sessions in high-traffic scenarios
- Implement WebSocket heartbeats for connection health
