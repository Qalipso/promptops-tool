import { z } from 'zod';
import { AssetIdSchema } from './ids.js';

export const AuditEventTypeSchema = z.enum([
  'asset.registered',
  'asset.updated',
  'asset.deprecated',
  'version.drafted',
  'version.edited',
  'version.promoted',
  'version.rolled_back',
  'version.archived',
  'testcase.added',
  'testcase.updated',
  'testcase.removed',
  'run.started',
  'run.completed',
  'regression.overridden',
]);

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  actor: z.string().min(1),
  event_type: AuditEventTypeSchema,
  asset_id: AssetIdSchema.nullable(),
  version_id: z.string().uuid().nullable(),
  payload: z.record(z.unknown()),
  payload_hash: z.string().length(64),
  occurred_at: z.string().datetime(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
