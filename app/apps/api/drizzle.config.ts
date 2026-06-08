import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: '../../infra/migrations-sqlite',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.PROMPTOPS_DB_PATH ?? join(homedir(), '.promptops', 'promptops.db'),
  },
  strict: true,
  verbose: true,
});
