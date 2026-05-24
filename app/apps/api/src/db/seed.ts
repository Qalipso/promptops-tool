/**
 * Seed script — inserts one demo asset for local dev.
 * Idempotent: skips inserts if records already exist.
 *
 * PromptOps stores prompt versions. Fixtures concept removed (manual inputs only).
 *
 * Usage: pnpm db:seed
 */
import { db } from './client.js';
import { assets } from './schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

const ASSET_ID = 'demo.email.subject-line-gen';

async function seed() {
  logger.info('Seeding demo data…');

  // ── Asset ──────────────────────────────────────────────────────────────
  const existing = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.id, ASSET_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(assets).values({
      id: ASSET_ID,
      owner: 'seed-operator',
      description: 'Generates email subject lines optimised for open rate.',
      tags: ['email', 'marketing', 'demo'],
      lifecycle: 'active' as const,
      variable_contract: [
        {
          name: 'user_product_name',
          kind: 'string',
          description: 'Name of the product being promoted',
          required: true,
        },
        {
          name: 'context_tone',
          kind: 'enum',
          description: 'Desired tone of the subject line',
          required: false,
          values: ['professional', 'casual', 'urgent'],
          default: 'professional',
        },
        {
          name: 'config_max_chars',
          kind: 'number',
          description: 'Maximum characters in output subject line',
          required: false,
          min: 20,
          max: 120,
          default: 60,
        },
      ],
      output_contract: {
        kind: 'free_text',
        description: 'A single email subject line string.',
      },
      model_config: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 100,
      },
      active_version_id: null,
    });
    logger.info({ asset_id: ASSET_ID }, 'Inserted asset');
  } else {
    logger.info({ asset_id: ASSET_ID }, 'Asset already exists — skipping');
  }

  logger.info('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
