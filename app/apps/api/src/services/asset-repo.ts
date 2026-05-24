import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { assets, type AssetInsert, type AssetRow } from '../db/schema.js';
import { errors } from '../lib/errors.js';
import { writeAudit } from './audit.js';

export async function listAssets(): Promise<AssetRow[]> {
  return db.select().from(assets);
}

export async function getAsset(id: string): Promise<AssetRow> {
  const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!row) throw errors.notFound(`Asset '${id}'`);
  return row;
}

export async function createAsset(
  data: AssetInsert,
  actor: string,
): Promise<AssetRow> {
  const existing = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.id, data.id))
    .limit(1);

  if (existing.length > 0) {
    throw errors.conflict(`Asset '${data.id}' already exists`);
  }

  const [row] = await db.insert(assets).values(data).returning();

  await writeAudit({
    actor,
    event_type: 'asset.created',
    asset_id: data.id,
    payload: { id: data.id, owner: data.owner },
  });

  return row!;
}

export interface AssetPatch {
  description?: string | undefined;
  tags?: string[] | undefined;
  lifecycle?: 'unregistered' | 'active' | 'deprecated' | 'sunset' | undefined;
  variable_contract?: unknown;
  output_contract?: unknown;
  model_config?: unknown;
}

export async function updateAsset(
  id: string,
  patch: AssetPatch,
  actor: string,
): Promise<AssetRow> {
  await getAsset(id); // 404 guard

  // Strip undefined — Drizzle strict mode rejects them in set()
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  );

  const [row] = await db
    .update(assets)
    .set({ ...clean, updated_at: sql`now()` })
    .where(eq(assets.id, id))
    .returning();

  await writeAudit({
    actor,
    event_type: 'asset.updated',
    asset_id: id,
    payload: patch as Record<string, unknown>,
  });

  return row!;
}
