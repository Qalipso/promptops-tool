import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: '../../infra/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://promptops:promptops@localhost:5432/promptops',
  },
  strict: true,
  verbose: true,
});
