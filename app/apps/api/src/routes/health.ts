import { Hono } from 'hono';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';

const health = new Hono();

health.get('/', async (c) => {
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
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
