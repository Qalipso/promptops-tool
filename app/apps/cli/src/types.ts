/** API row shapes (subset used by the CLI). Mirrors apps/api schema. */

export type Lifecycle = 'unregistered' | 'active' | 'deprecated' | 'sunset';
export type VersionState = 'draft' | 'active' | 'previous' | 'archived';

export interface AssetStats {
  version_count: number;
  last_rendered_at: string | null;
}

export interface Asset {
  id: string;
  owner: string;
  description: string;
  tags: string[];
  lifecycle: Lifecycle;
  variable_contract: unknown;
  output_contract: unknown;
  model_config: unknown;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
  stats?: AssetStats;
}

export interface PromptBody {
  system?: string | null;
  user: string;
}

export interface Version {
  id: string;
  asset_id: string;
  version: string;
  parent_version_id: string | null;
  state: VersionState;
  body: PromptBody;
  variable_contract_snapshot: unknown;
  model_config_snapshot: unknown;
  output_contract_snapshot: unknown;
  changelog: string | null;
  author: string;
  etag: string;
  body_hash: string;
  created_at: string;
  promoted_at: string | null;
}

export interface AuditEvent {
  id: string;
  actor: string;
  event_type: string;
  asset_id: string | null;
  version_id: string | null;
  payload: Record<string, unknown>;
  payload_hash: string;
  occurred_at: string;
}

export interface RenderResult {
  version_id: string;
  inputs: Record<string, unknown>;
  rendered_system: string | null;
  rendered_user: string;
  rendered_hash: string;
  unresolved_variables: string[];
  unused_inputs: string[];
}
