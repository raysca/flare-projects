# LinearFlow

A high-performance, real-time issue tracking and project management platform built entirely on Cloudflare's edge infrastructure.

## Project Structure

This is a Bun monorepo with the following structure:

```
linearflow/
├── apps/
│   ├── worker/       # Cloudflare Worker (Hono API)
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Drizzle ORM schemas and migrations
│   └── shared/       # Shared types and utilities
├── PRD.md           # Product Requirements Document
└── openapi.yaml     # API specification
```

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TanStack Query
- Tailwind CSS

**Backend:**
- Cloudflare Workers
- Hono (routing framework)
- Drizzle ORM

**Infrastructure:**
- D1 (SQLite database)
- Durable Objects (real-time collaboration)
- R2 (file storage)
- KV (caching)
- Queues (async tasks)
- Vectorize (semantic search)
- Workers AI (intelligence)
- Analytics Engine (metrics)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) >= 3.0
- Cloudflare account

### Installation

1. Install dependencies:
```bash
bun install
```

2. Set up Cloudflare resources:
```bash
# Create D1 database
wrangler d1 create linearflow-db

# Create KV namespace
wrangler kv:namespace create KV

# Create R2 bucket
wrangler r2 bucket create linearflow-files

# Create Vectorize index
wrangler vectorize create linearflow-issues --dimensions=768 --metric=cosine
```

3. Update `apps/worker/wrangler.toml` with the resource IDs from the previous step.

### Development

Start all workspaces in development mode:
```bash
bun dev
```

Or run specific workspaces:
```bash
# Start worker only
cd apps/worker && bun dev

# Start web only
cd apps/web && bun dev
```

### Code Quality

```bash
# Format code
bun format

# Lint code
bun lint

# Type check
bun type-check
```

## Project Status

**Current Milestone:** M1.1 - Project Setup & Infrastructure ✅

See [PRD.md](./PRD.md) for the complete development roadmap.

## License

MIT 
