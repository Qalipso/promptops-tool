import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/* ----- Enums ----- */

export const versionStateEnum = pgEnum('version_state', [
  'draft',
  'active',
  'previous',
  'archived',
]);

export const assetLifecycleEnum = pgEnum('asset_lifecycle', [
  'unregistered',
  'active',
  'deprecated',
  'sunset',
]);

// run_status and case_result enums removed —
// LLM evaluation is not part of PromptOps scope (use AI Eval tool)

/* ----- Tables ----- */

/**
 * Asset = the durable identity for a managed prompt.
 * One row per asset. Variable/output/model configs evolve via versions.
 */
export const assets = pgTable(
  'assets',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    owner: varchar('owner', { length: 256 }).notNull(),
    description: text('description').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    lifecycle: assetLifecycleEnum('lifecycle').notNull().default('unregistered'),
    variable_contract: jsonb('variable_contract').notNull(),
    output_contract: jsonb('output_contract').notNull(),
    model_config: jsonb('model_config').notNull(),
    active_version_id: uuid('active_version_id'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
export const versions = pgTable(
  'versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    asset_id: varchar('asset_id', { length: 128 })
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    version: varchar('version', { length: 32 }).notNull(),
    parent_version_id: uuid('parent_version_id'),
    state: versionStateEnum('state').notNull().default('draft'),
    body: jsonb('body').notNull(),
    variable_contract_snapshot: jsonb('variable_contract_snapshot').notNull(),
    model_config_snapshot: jsonb('model_config_snapshot').notNull(),
    output_contract_snapshot: jsonb('output_contract_snapshot').notNull(),
    changelog: text('changelog'),
    author: varchar('author', { length: 256 }).notNull(),
    etag: varchar('etag', { length: 64 }).notNull(),
    body_hash: varchar('body_hash', { length: 64 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    promoted_at: timestamp('promoted_at', { withTimezone: true }),
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
 *
 * fixture_id, source, checks_config, render_check_results columns kept for backward DB compat
 * but no longer populated by app (fixtures removed). Will be dropped in next migration.
 */
export const renderValidations = pgTable(
  'render_validations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    version_id: uuid('version_id')
      .notNull()
      .references(() => versions.id, { onDelete: 'cascade' }),
    fixture_id: uuid('fixture_id'),
    source: varchar('source', { length: 16 }).notNull().default('manual'),
    inputs_snapshot: jsonb('inputs_snapshot').notNull(),
    rendered_system: text('rendered_system'),
    rendered_user: text('rendered_user').notNull(),
    rendered_hash: varchar('rendered_hash', { length: 64 }).notNull(),
    checks_config: jsonb('checks_config').notNull().default([]),
    render_check_results: jsonb('render_check_results').notNull().default([]),
    unresolved_variables: jsonb('unresolved_variables').$type<string[]>().notNull().default([]),
    unused_inputs: jsonb('unused_inputs').$type<string[]>().notNull().default([]),
    created_by: varchar('created_by', { length: 256 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    versionIdx: index('render_validations_version_idx').on(t.version_id),
  }),
);

/**
 * Append-only audit log. App role should not have UPDATE or DELETE on this table.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actor: varchar('actor', { length: 256 }).notNull(),
    event_type: varchar('event_type', { length: 64 }).notNull(),
    asset_id: varchar('asset_id', { length: 128 }),
    version_id: uuid('version_id'),
    payload: jsonb('payload').notNull(),
    payload_hash: varchar('payload_hash', { length: 64 }).notNull(),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    assetIdx: index('audit_log_asset_idx').on(t.asset_id, t.occurred_at),
    eventTypeIdx: index('audit_log_event_type_idx').on(t.event_type, t.occurred_at),
    actorIdx: index('audit_log_actor_idx').on(t.actor, t.occurred_at),
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

/* boolean / integer imports kept for future schema additions */
void boolean;
void integer;
void primaryKey;
