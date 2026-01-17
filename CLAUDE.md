# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Start all workspaces in development mode
bun dev

# Start specific workspace
cd apps/worker && bun dev    # Worker API on default Wrangler port
cd apps/web && bun dev       # Web app on port 3000

# Build all workspaces
bun build

# Linting and formatting
bun lint                     # Run ESLint across all workspaces
bun format                   # Format with Prettier
bun format:check             # Check formatting without writing
bun type-check               # TypeScript type checking

# Web app specific
cd apps/web && bun test      # Run Vitest tests
cd apps/web && bun run check # Format + lint with auto-fix

# Database management (from packages/database)
cd packages/database
bun run db:generate          # Generate Drizzle migrations
bun run db:push              # Push schema changes to D1
bun run db:studio            # Open Drizzle Studio

# Deployment
cd apps/worker && bun run deploy  # Deploy worker to Cloudflare
cd apps/web && bun run deploy     # Build and deploy web app
```

## Architecture Overview

This is a **Bun monorepo** for a real-time issue tracking platform running entirely on Cloudflare's edge infrastructure.

### Monorepo Structure

- **apps/worker** - Cloudflare Worker API using Hono framework
- **apps/web** - React frontend using TanStack Start (Vite-based SSR framework)
- **packages/database** - Drizzle ORM schemas for D1 (SQLite)
- **packages/shared** - Shared types and utilities

### Backend Architecture (apps/worker)

The worker uses **Hono** as the routing framework with the following patterns:

- Routes are organized in `src/routes/` (auth, workspaces, invitations, users)
- Environment bindings defined in `src/index.ts` as `Bindings` type
- API routes mounted at `/api/v1/*`
- **Durable Objects** in `src/durable-objects/` for real-time collaboration:
  - `WorkspaceDO` - Workspace-level real-time state
  - `IssueDO` - Issue-level real-time updates

### Cloudflare Bindings (wrangler.toml)

The worker has access to these Cloudflare services:
- `DB` - D1 SQLite database
- `KV` - Key-value store for caching/sessions
- `R2` - Object storage for files
- `WORKSPACE_DO` / `ISSUE_DO` - Durable Object namespaces
- `QUEUE` - Queue for async processing
- `VECTORIZE` - Vector index for semantic search
- `AI` - Workers AI
- `ANALYTICS` - Analytics Engine

### Frontend Architecture (apps/web)

Uses **TanStack Start** with file-based routing:
- Routes defined in `src/routes/` (file-based routing generates `routeTree.gen.ts`)
- TanStack Query for data fetching with SSR integration
- Tailwind CSS v4 for styling
- Path alias `@/` maps to `src/`

### Database Schema (packages/database)

Drizzle ORM schemas are split by domain in `src/schema/`:
- users, workspaces, teams, projects
- issues, cycles, labels, comments
- attachments, notifications, activity, invitations

All schemas exported through `src/schema/index.ts`.

## Code Conventions

- Unused variables should be prefixed with `_` (ESLint configured)
- Use `@hono/zod-validator` for request validation in worker routes
- Shadcn components: install with `pnpm dlx shadcn@latest add <component>`
