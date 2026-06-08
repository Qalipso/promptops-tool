import { randomUUID } from 'node:crypto';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/* ----- Enum value sets (SQLite has no native enum — stored as text) ----- */

export const VERSION_STATES = ['draft', 'active', 'previous', 'archived'] as const;
export const ASSET_LIFECYCLES = ['unregistered', 'active', 'deprecated', 'sunset'] as const;

/* ----- Tables ----- */

/**
 * Asset = the durable identity for a managed prompt.
 * One row per asset. Variable/output/model configs evolve via versions.
 */
export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    description: text('description').notNull().default(''),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
    lifecycle: text('lifecycle', { enum: ASSET_LIFECYCLES }).notNull().default('unregistered'),
    variable_contract: text('variable_contract', { mode: 'json' }).notNull(),
    output_contract: text('output_contract', { mode: 'json' }).notNull(),
    model_config: text('model_config', { mode: 'json' }).notNull(),
    active_version_id: text('active_version_id'),
    // Builder wizard inputs (BuilderSpec). Null for assets not made via the builder.
    builder_spec: text('builder_spec', { mode: 'json' }),
    created_at: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({
    ownerIdx: index('assets_owner_idx').on(t.owner),
    lifecycleIdx: index('assets_lifecycle_idx').on(t.lifecycle),
  }),
);

/**
 * Version = immutable snapshot of an asset at a point in time.
 * `draft` rows are mutable; all other states are immutable.
 */
export const versions = sqliteTable(
  'versions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    version: text('version').notNull(),
    parent_version_id: text('parent_version_id'),
    state: text('state', { enum: VERSION_STATES }).notNull().default('draft'),
    body: text('body', { mode: 'json' }).notNull(),
    variable_contract_snapshot: text('variable_contract_snapshot', { mode: 'json' }).notNull(),
    model_config_snapshot: text('model_config_snapshot', { mode: 'json' }).notNull(),
    output_contract_snapshot: text('output_contract_snapshot', { mode: 'json' }).notNull(),
    changelog: text('changelog'),
    author: text('author').notNull(),
    etag: text('etag').notNull(),
    body_hash: text('body_hash').notNull(),
    created_at: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
    promoted_at: integer('promoted_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    assetVersionUnique: uniqueIndex('versions_asset_version_unique').on(t.asset_id, t.version),
    assetStateIdx: index('versions_asset_state_idx').on(t.asset_id, t.state),
    bodyHashIdx: index('versions_body_hash_idx').on(t.body_hash),
  }),
);

/**
 * Render validation — result of rendering a version's template with inputs.
 * Template variable substitution only — no LLM call, no output quality score.
 *
 * Manual inputs only — fixtures concept removed.
 * rendered_hash: SHA256 of rendered text — proves exactly what was rendered
 * unresolved_variables: {{vars}} still present after substitution (missing inputs)
 * unused_inputs: input keys not referenced in the template
 */
export const renderValidations = sqliteTable(
  'render_validations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    version_id: text('version_id')
      .notNull()
      .references(() => versions.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('manual'),
    inputs_snapshot: text('inputs_snapshot', { mode: 'json' }).notNull(),
    rendered_system: text('rendered_system'),
    rendered_user: text('rendered_user').notNull(),
    rendered_hash: text('rendered_hash').notNull(),
    unresolved_variables: text('unresolved_variables', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    unused_inputs: text('unused_inputs', { mode: 'json' }).$type<string[]>().notNull().default([]),
    created_by: text('created_by').notNull(),
    created_at: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({
    versionIdx: index('render_validations_version_idx').on(t.version_id),
  }),
);

/**
 * Append-only audit log. App role should not perform UPDATE or DELETE on this table.
 */
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    actor: text('actor').notNull(),
    event_type: text('event_type').notNull(),
    asset_id: text('asset_id'),
    version_id: text('version_id'),
    payload: text('payload', { mode: 'json' }).notNull(),
    payload_hash: text('payload_hash').notNull(),
    occurred_at: integer('occurred_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({
    assetIdx: index('audit_log_asset_idx').on(t.asset_id, t.occurred_at),
    eventTypeIdx: index('audit_log_event_type_idx').on(t.event_type, t.occurred_at),
    actorIdx: index('audit_log_actor_idx').on(t.actor, t.occurred_at),
  }),
);

/**
 * Test case — a baseline behavioral check authored in the builder.
 * Inputs only (no LLM run here). Used to feed the external AI Eval tool.
 */
export const testCases = sqliteTable(
  'test_cases',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    input: text('input', { mode: 'json' }).notNull(),
    note: text('note'),
    source: text('source').notNull().default('manual'),
    created_at: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({
    assetIdx: index('test_cases_asset_idx').on(t.asset_id),
  }),
);

/**
 * Eval import — parsed results of an eval .txt produced by the AI Eval tool.
 * PromptOps ingests results, it does not run evals.
 */
export const evalImports = sqliteTable(
  'eval_imports',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    version_id: text('version_id'),
    filename: text('filename'),
    summary: text('summary', { mode: 'json' }).notNull(),
    parsed: text('parsed', { mode: 'json' }).notNull(),
    raw: text('raw').notNull(),
    created_by: text('created_by').notNull(),
    created_at: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({
    assetIdx: index('eval_imports_asset_idx').on(t.asset_id, t.created_at),
  }),
);

/* ----- Inferred types ----- */
export type AssetRow = typeof assets.$inferSelect;
export type AssetInsert = typeof assets.$inferInsert;
export type VersionRow = typeof versions.$inferSelect;
export type VersionInsert = typeof versions.$inferInsert;
export type RenderValidationRow = typeof renderValidations.$inferSelect;
export type AuditEventRow = typeof auditLog.$inferSelect;
export type AuditEventInsert = typeof auditLog.$inferInsert;
export type TestCaseRow = typeof testCases.$inferSelect;
export type TestCaseInsert = typeof testCases.$inferInsert;
export type EvalImportRow = typeof evalImports.$inferSelect;
export type EvalImportInsert = typeof evalImports.$inferInsert;
