import { z } from 'zod';
import { AssetIdSchema, SemverSchema } from './ids.js';
import { ModelConfigSchema, OutputContractSchema, PromptBodySchema } from './model-config.js';
import { VariableContractSchema } from './variable.js';

export const VersionStateSchema = z.enum(['draft', 'active', 'previous', 'archived']);
export type VersionState = z.infer<typeof VersionStateSchema>;

export const AssetLifecycleSchema = z.enum(['unregistered', 'active', 'deprecated', 'sunset']);
export type AssetLifecycle = z.infer<typeof AssetLifecycleSchema>;

export const AssetSchema = z.object({
  id: AssetIdSchema,
  owner: z.string().email().or(z.string().min(1)),
  description: z.string().max(1000),
  tags: z.array(z.string()).default([]),
  lifecycle: AssetLifecycleSchema.default('unregistered'),
  variable_contract: VariableContractSchema,
  output_contract: OutputContractSchema,
  model_config: ModelConfigSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Asset = z.infer<typeof AssetSchema>;

export const VersionSchema = z.object({
  id: z.string().uuid(),
  asset_id: AssetIdSchema,
  version: SemverSchema,
  parent_version_id: z.string().uuid().nullable(),
  state: VersionStateSchema,
  body: PromptBodySchema,
  /** Snapshots of the asset-level contracts at promotion time. */
  variable_contract_snapshot: VariableContractSchema,
  model_config_snapshot: ModelConfigSchema,
  output_contract_snapshot: OutputContractSchema,
  changelog: z.string().max(4000).nullable(),
  author: z.string().min(1),
  etag: z.string().min(1),
  created_at: z.string().datetime(),
  promoted_at: z.string().datetime().nullable(),
});

export type Version = z.infer<typeof VersionSchema>;
