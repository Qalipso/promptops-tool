import 'dotenv/config';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const DEFAULT_DB_PATH = join(homedir(), '.promptops', 'promptops.db');

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3013),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    /** Local single-user mode: auth bypassed, actor = "local". Default on. */
    PROMPTOPS_LOCAL: z
      .enum(['0', '1', 'true', 'false'])
      .default('1')
      .transform((v) => v === '1' || v === 'true'),
    /** SQLite database file. Auto-created on first boot. */
    PROMPTOPS_DB_PATH: z.string().min(1).default(DEFAULT_DB_PATH),
    /** Bearer token — only required when PROMPTOPS_LOCAL is off. */
    PROMPTOPS_API_TOKEN: z.string().optional(),
  })
  .superRefine((cfg, ctx) => {
    if (!cfg.PROMPTOPS_LOCAL) {
      if (!cfg.PROMPTOPS_API_TOKEN || cfg.PROMPTOPS_API_TOKEN.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PROMPTOPS_API_TOKEN'],
          message: 'PROMPTOPS_API_TOKEN (min 16 chars) is required when PROMPTOPS_LOCAL is off',
        });
      }
    }
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
