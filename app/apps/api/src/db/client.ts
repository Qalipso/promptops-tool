import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../lib/env.js';
import * as schema from './schema.js';

let _sqlite: Database.Database | null = null;

export function getSqlite(): Database.Database {
  if (!_sqlite) {
    mkdirSync(dirname(env.PROMPTOPS_DB_PATH), { recursive: true });
    _sqlite = new Database(env.PROMPTOPS_DB_PATH);
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('foreign_keys = ON');
  }
  return _sqlite;
}

export const db = drizzle(getSqlite(), {
  schema,
  logger: env.NODE_ENV === 'development',
});

export type DB = typeof db;
export { schema };
