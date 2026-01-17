# @linearflow/database

Database package for LinearFlow - contains Drizzle ORM schemas, migrations, and seed data.

## Features

- **Drizzle ORM schemas** for all entities (users, workspaces, teams, issues, etc.)
- **D1 database** integration
- **Type-safe** database operations
- **Migrations** management with drizzle-kit
- **Seed data** for development

## Database Schema

The database includes the following main entities:

- **Users** - User accounts and authentication
- **Workspaces** - Multi-tenant workspaces
- **Teams** - Teams within workspaces
- **Issues** - Core issue tracking
- **Projects** - Project grouping
- **Cycles** - Sprint/cycle management
- **Labels** - Issue categorization
- **Comments** - Issue discussions
- **Attachments** - File storage metadata
- **Notifications** - User notifications
- **Activity Log** - Audit trail

## Usage

### In Cloudflare Workers

```typescript
import { createDrizzleClient } from "@linearflow/database";

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env) {
    const db = createDrizzleClient(env.DB);

    // Use the database
    const users = await db.select().from(schema.users).all();

    return Response.json(users);
  },
};
```

## Development Commands

```bash
# Generate migrations from schema changes
bun run db:generate

# Push migrations to D1 (local development)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio

# Type check
bun run type-check
```

## Migrations

Migrations are automatically generated in the `migrations/` directory when you run `db:generate`.

To apply migrations to your D1 database:

```bash
# Local development
wrangler d1 execute linearflow-db --local --file=./migrations/0000_initial.sql

# Production
wrangler d1 execute linearflow-db --file=./migrations/0000_initial.sql
```

## Seed Data

The seed data includes:
- 3 test users (admin, john, jane)
- 1 demo workspace
- 2 teams (Engineering, Design)
- Sample labels, projects, cycles, and issues

To seed your database, import and call the `seed` function:

```typescript
import { seed } from "@linearflow/database/src/seed";
import { createDrizzleClient } from "@linearflow/database";

const db = createDrizzleClient(env.DB);
await seed(db);
```

## Schema Updates

When you modify schemas:

1. Update the schema files in `src/schema/`
2. Run `bun run db:generate` to create a new migration
3. Apply the migration to your D1 database
4. The types will automatically update

## Type Safety

All schemas export TypeScript types:

```typescript
import type { User, NewUser, Issue, NewIssue } from "@linearflow/database";

// User is the SELECT type (with defaults applied)
// NewUser is the INSERT type (only required fields)
```
