import { createHash } from 'node:crypto';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { auditLog, type AuditEventRow } from '../db/schema.js';

export async function listAuditEvents(
  asset_id: string,
  limit = 50,
): Promise<AuditEventRow[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  return db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.asset_id, asset_id), gte(auditLog.occurred_at, since)))
    .orderBy(desc(auditLog.occurred_at))
    .limit(limit);
}

export async function getAssetStats(asset_id: string): Promise<{
  version_count: number;
  last_rendered_at: string | null;
}> {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM versions WHERE asset_id = ${asset_id})::int AS version_count,
      (SELECT rv.created_at FROM render_validations rv
        JOIN versions v ON v.id = rv.version_id
        WHERE v.asset_id = ${asset_id}
        ORDER BY rv.created_at DESC LIMIT 1) AS last_rendered_at
  `);
  const r = (result.rows[0] ?? {}) as Record<string, unknown>;
  return {
    version_count: Number(r['version_count'] ?? 0),
    last_rendered_at: r['last_rendered_at'] ? String(r['last_rendered_at']) : null,
  };
}

export type AuditEventType =
  | 'asset.created'
  | 'asset.updated'
  | 'version.created'
  | 'version.promoted'
  | 'version.archived'
  | 'version.rolled_back'
  | 'version.rendered'
  | 'render_validation.created';

export async function writeAudit(opts: {
  actor: string;
  event_type: AuditEventType;
  asset_id?: string;
  version_id?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const payloadJson = JSON.stringify(opts.payload);
  const payload_hash = createHash('sha256').update(payloadJson).digest('hex');

  await db.insert(auditLog).values({
    actor: opts.actor,
    event_type: opts.event_type,
    asset_id: opts.asset_id ?? null,
    version_id: opts.version_id ?? null,
    payload: opts.payload,
    payload_hash,
  });
}
