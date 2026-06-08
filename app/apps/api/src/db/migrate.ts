import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { logger } from '../lib/logger.js';
import { db, getSqlite } from './client.js';

function main() {
  logger.info('Running migrations...');
  migrate(db, { migrationsFolder: '../../infra/migrations-sqlite' });
  logger.info('Migrations complete.');
  getSqlite().close();
}

try {
  main();
} catch (err) {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
}
