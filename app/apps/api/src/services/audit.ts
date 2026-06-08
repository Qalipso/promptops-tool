import { createHash } from 'node:crypto';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { type AuditEventRow, auditLog, renderValidations, versions } from '../db/schema.js';

export async function listAuditEvents(asset_id: string, limit = 50): Promise<AuditEventRow[]> {
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
  const [vc] = await db
    .select({ value: count() })
    .from(versions)
    .where(eq(versions.asset_id, asset_id));

  const [last] = await db
    .select({ created_at: renderValidations.created_at })
    .from(renderValidations)
    .innerJoin(versions, eq(versions.id, renderValidations.version_id))
    .where(eq(versions.asset_id, asset_id))
    .orderBy(desc(renderValidations.created_at))
    .limit(1);

  return {
    version_count: vc?.value ?? 0,
    last_rendered_at: last?.created_at ? last.created_at.toISOString() : null,
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
  | 'render_validation.created'
  | 'builder.spec_saved'
  | 'test_case.created'
  | 'test_case.generated'
  | 'test_case.deleted'
  | 'eval.imported';

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
