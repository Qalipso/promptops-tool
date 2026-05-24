import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, getPool } from './client.js';
import { logger } from '../lib/logger.js';

async function main() {
  logger.info('Running migrations...');
  await migrate(db, { migrationsFolder: '../../infra/migrations' });
  logger.info('Migrations complete.');
  await getPool().end();
}

main().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
