#!/usr/bin/env bun
/**
 * Seed script for local development
 * Run with: bun run src/db/seed.ts
 */

import { db } from './client';
import { seed } from '@linearflow/database';

async function main() {
  console.log('Starting seed...\n');

  try {
    await seed(db as any, {
      clean: true,
      verbose: true,
    });
    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
