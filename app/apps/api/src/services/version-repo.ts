import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { assets, versions, type VersionInsert, type VersionRow } from '../db/schema.js';
import { errors } from '../lib/errors.js';
import { writeAudit } from './audit.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

function makeEtag(body_hash: string, version: string): string {
  return createHash('sha256').update(`${body_hash}:${version}`).digest('hex').slice(0, 16);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function listVersions(asset_id: string): Promise<VersionRow[]> {
  return db.select().from(versions).where(eq(versions.asset_id, asset_id));
}

export async function getVersion(id: string): Promise<VersionRow> {
  const [row] = await db.select().from(versions).where(eq(versions.id, id)).limit(1);
  if (!row) throw errors.notFound(`Version '${id}'`);
  return row;
}

export async function getActiveVersion(asset_id: string): Promise<VersionRow | null> {
  const [row] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.asset_id, asset_id), eq(versions.state, 'active')))
    .limit(1);
  return row ?? null;
}

export async function getDraftVersion(asset_id: string): Promise<VersionRow | null> {
  const [row] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.asset_id, asset_id), eq(versions.state, 'draft')))
    .limit(1);
  return row ?? null;
}

// ── Writes ────────────────────────────────────────────────────────────────────

export interface CreateVersionInput {
  asset_id: string;
  version: string;
  parent_version_id?: string | undefined;
  body: unknown;
  variable_contract_snapshot: unknown;
  model_config_snapshot: unknown;
  output_contract_snapshot: unknown;
  changelog?: string | undefined;
  author: string;
}

export async function createVersion(
  data: CreateVersionInput,
  actor: string,
): Promise<VersionRow> {
  // Only one draft per asset
  const existing_draft = await getDraftVersion(data.asset_id);
  if (existing_draft) {
    throw errors.conflict(
      `Asset '${data.asset_id}' already has a draft version (${existing_draft.version}). Publish or delete it first.`,
    );
  }

  // Duplicate version string guard
  const [dup] = await db
    .select({ id: versions.id })
    .from(versions)
    .where(and(eq(versions.asset_id, data.asset_id), eq(versions.version, data.version)))
    .limit(1);
  if (dup) throw errors.conflict(`Version '${data.version}' already exists for asset '${data.asset_id}'`);

  const body_hash = hashBody(data.body);
  const etag = makeEtag(body_hash, data.version);

  const insert: VersionInsert = {
    asset_id: data.asset_id,
    version: data.version,
    parent_version_id: data.parent_version_id ?? null,
    body: data.body,
    variable_contract_snapshot: data.variable_contract_snapshot,
    model_config_snapshot: data.model_config_snapshot,
    output_contract_snapshot: data.output_contract_snapshot,
    changelog: data.changelog ?? null,
    author: data.author,
    body_hash,
    etag,
    state: 'draft',
  };

  const [row] = await db.insert(versions).values(insert).returning();

  await writeAudit({
    actor,
    event_type: 'version.created',
    asset_id: data.asset_id,
    version_id: row!.id,
    payload: { version: data.version, body_hash, etag },
  });

  return row!;
}

/** Promotes a draft to active. Previous active → previous. */
export async function promoteVersion(
  version_id: string,
  actor: string,
): Promise<VersionRow> {
  const row = await getVersion(version_id);

  if (row.state !== 'draft') {
    throw errors.badRequest(`Only draft versions can be promoted. Current state: '${row.state}'`);
  }

  // Demote current active → previous
  await db
    .update(versions)
    .set({ state: 'previous' })
    .where(and(eq(versions.asset_id, row.asset_id), eq(versions.state, 'active')));

  // Promote this draft → active
  const [promoted] = await db
    .update(versions)
    .set({ state: 'active', promoted_at: sql`now()` })
    .where(eq(versions.id, version_id))
    .returning();

  // Update asset's active_version_id
  await db
    .update(assets)
    .set({ active_version_id: version_id, updated_at: sql`now()` })
    .where(eq(assets.id, row.asset_id));

  await writeAudit({
    actor,
    event_type: 'version.promoted',
    asset_id: row.asset_id,
    version_id,
    payload: { version: row.version },
  });

  return promoted!;
}

/**
 * Rollback: promotes the most recent `previous` version back to `active`.
 * The current `active` becomes `previous`.
 */
export async function rollbackVersion(
  asset_id: string,
  actor: string,
  justification: string,
): Promise<VersionRow> {
  // Find most recent previous
  const [previous] = await db
    .select()
    .from(versions)
    .where(and(eq(versions.asset_id, asset_id), eq(versions.state, 'previous')))
    .orderBy(versions.promoted_at)
    .limit(1);

  if (!previous) {
    throw errors.badRequest(`No previous version to roll back to for asset '${asset_id}'`);
  }

  // Demote current active → previous
  await db
    .update(versions)
    .set({ state: 'previous' })
    .where(and(eq(versions.asset_id, asset_id), eq(versions.state, 'active')));

  // Re-activate the previous version
  const [restored] = await db
    .update(versions)
    .set({ state: 'active', promoted_at: sql`now()` })
    .where(eq(versions.id, previous.id))
    .returning();

  // Update asset pointer
  await db
    .update(assets)
    .set({ active_version_id: previous.id, updated_at: sql`now()` })
    .where(eq(assets.id, asset_id));

  await writeAudit({
    actor,
    event_type: 'version.rolled_back',
    asset_id,
    version_id: previous.id,
    payload: { version: previous.version, justification },
  });

  return restored!;
}

/** Archives any non-draft version. */
export async function archiveVersion(
  version_id: string,
  actor: string,
): Promise<VersionRow> {
  const row = await getVersion(version_id);

  if (row.state === 'draft') {
    throw errors.badRequest(`Draft versions cannot be archived directly. Delete them instead.`);
  }
  if (row.state === 'archived') {
    throw errors.badRequest(`Version '${version_id}' is already archived.`);
  }

  const [archived] = await db
    .update(versions)
    .set({ state: 'archived' })
    .where(eq(versions.id, version_id))
    .returning();

  await writeAudit({
    actor,
    event_type: 'version.archived',
    asset_id: row.asset_id,
    version_id,
    payload: { version: row.version, previous_state: row.state },
  });

  return archived!;
}
