#!/usr/bin/env bun
/**
 * CLI script to seed the database
 *
 * Usage:
 *   bun run db:seed                    # Seed with clean (removes existing data)
 *   bun run db:seed --no-clean         # Seed without cleaning
 *   bun run db:seed --verbose          # Verbose output
 *   bun run db:seed --tables users,teams  # Seed specific tables only
 *
 * Note: This script requires wrangler to be configured with D1 database access.
 * Run from the packages/database directory.
 */

import { seed, SeedOptions } from "./index";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../schema";

// Parse command line arguments
function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    clean: true,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--no-clean") {
      options.clean = false;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--tables" || arg === "-t") {
      const tables = args[++i];
      if (tables) {
        options.tables = tables.split(",") as SeedOptions["tables"];
      }
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Database Seed CLI

Usage:
  bun run db:seed [options]

Options:
  --no-clean       Don't clean existing data before seeding
  --verbose, -v    Enable verbose logging
  --tables, -t     Comma-separated list of tables to seed
                   (users,workspaces,teams,labels,projects,cycles,issues,comments,notifications)
  --help, -h       Show this help message

Examples:
  bun run db:seed                         # Full seed with clean
  bun run db:seed --no-clean              # Add seed data without removing existing
  bun run db:seed --tables users,teams    # Only seed users and teams
  bun run db:seed --verbose               # Show detailed output
`);
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("🔌 Connecting to D1 database...\n");

  // This script is designed to be run with wrangler
  // For local development, you can use wrangler d1 execute
  // For this CLI to work directly, we need the D1 binding

  // Check if we're running in a Cloudflare Workers context
  // @ts-expect-error - D1 binding may not be available
  if (typeof globalThis.DB === "undefined") {
    console.error("❌ Error: D1 database binding not found.");
    console.error("");
    console.error("This script needs to run in a Cloudflare Workers context.");
    console.error("Use one of these methods:");
    console.error("");
    console.error("1. Via wrangler (recommended):");
    console.error("   cd apps/worker");
    console.error("   wrangler d1 execute linearflow-db --local --command \"SELECT 1\"");
    console.error("");
    console.error("2. Create a worker route that calls the seed function:");
    console.error("   app.get('/api/dev/seed', async (c) => {");
    console.error("     const db = drizzle(c.env.DB, { schema });");
    console.error("     await seed(db);");
    console.error("     return c.json({ success: true });");
    console.error("   });");
    console.error("");
    process.exit(1);
  }

  // @ts-expect-error - D1 binding
  const db = drizzle(globalThis.DB, { schema });

  try {
    await seed(db, options);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
