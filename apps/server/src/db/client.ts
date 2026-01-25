import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from '@linearflow/database';

const DATABASE_URL = process.env.DATABASE_URL || './data/linearflow.db';

const sqlite = new Database(DATABASE_URL);

// Enable WAL mode for better concurrent performance
sqlite.run('PRAGMA journal_mode = WAL;');
sqlite.run('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
