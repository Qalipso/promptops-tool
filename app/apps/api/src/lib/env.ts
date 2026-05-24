import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3030),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PROMPTOPS_API_TOKEN: z
    .string()
    .min(16, 'PROMPTOPS_API_TOKEN must be at least 16 characters'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_DEFAULT_MODEL: z.string().default('gpt-4o-mini'),
  MAX_USD_PER_RUN: z.coerce.number().nonnegative().default(1.0),
  MAX_USD_PER_DAY: z.coerce.number().nonnegative().default(10.0),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with clear message — do not start with bad config.
  // biome-ignore lint/suspicious/noConsole: startup-only diagnostic
  console.error('Invalid environment configuration:');
  // biome-ignore lint/suspicious/noConsole: startup-only diagnostic
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
