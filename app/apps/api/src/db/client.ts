import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../lib/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

export const db = drizzle(getPool(), { schema, logger: env.NODE_ENV === 'development' });

export type DB = typeof db;
export { schema };
