import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/client.js';

const health = new Hono();

health.get('/', async (c) => {
  let dbOk = false;
  try {
    db.get(sql`SELECT 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? 200 : 503;
  return c.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'up' : 'down',
      ts: new Date().toISOString(),
    },
    status,
  );
});

export { health };
