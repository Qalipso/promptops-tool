/**
 * Server-side API client. Uses direct URL + Bearer token.
 * Never runs in the browser — all pages are Server Components.
 *
 * PromptOps stores prompt versions. AI Eval scores model outputs.
 *
 * DEMO_MODE=true → return mock fixtures, no real API needed.
 */
import * as mock from './mock-data';

const DEMO = process.env.DEMO_MODE === 'true';
const API_URL = process.env.PROMPTOPS_API_URL ?? 'http://localhost:3013';
const TOKEN = process.env.PROMPTOPS_API_TOKEN ?? '';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { revalidate: 10 }, // 10s cache
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API PATCH ${path} → ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API POST ${path} → ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssetStats {
  version_count: number;
  last_rendered_at: string | null;
}

// RenderCheckResult removed — checks handled by AI Eval, not PromptOps

export interface VariableContractEntry {
  name: string;
  kind: string;
  required?: boolean;
  description?: string;
  values?: string[];
  default?: unknown;
}

export interface Asset {
  id: string;
  owner: string;
  description: string;
  tags: string[];
  lifecycle: 'unregistered' | 'active' | 'deprecated' | 'sunset';
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
  stats?: AssetStats;
  variable_contract?: VariableContractEntry[];
  output_contract?: Record<string, unknown>;
  model_config?: Record<string, unknown>;
}

export interface VersionBody {
  system?: string | null;
  user: string;
}

export interface Version {
  id: string;
  asset_id: string;
  version: string;
  state: 'draft' | 'active' | 'previous' | 'archived';
  body: VersionBody;
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

/** Result of POST /render — template substitution only, no LLM call. */
export interface RenderResult {
  version_id: string;
  inputs: Record<string, unknown>;
  rendered_system: string | null;
  rendered_user: string;
  /** SHA256(rendered_system + ':' + rendered_user) — proves exactly what was rendered */
  rendered_hash: string;
  /** Template variables still present ({{var}}) after substitution — missing inputs */
  unresolved_variables: string[];
  /** Input keys not referenced in the template — silently ignored inputs */
  unused_inputs: string[];
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

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const api = {
  assets: () =>
    DEMO ? Promise.resolve(mock.MOCK_ASSETS) : apiFetch<Asset[]>('/api/v0/assets'),
  asset: (id: string) =>
    DEMO
      ? Promise.resolve(mock.MOCK_ASSETS.find((a) => a.id === id) ?? null).then((a) => {
          if (!a) throw new Error('not found');
          return a;
        })
      : apiFetch<Asset>(`/api/v0/assets/${id}`),
  stats: (id: string) =>
    DEMO
      ? Promise.resolve(mock.MOCK_STATS[id] ?? null)
      : apiFetch<AssetStats>(`/api/v0/assets/${id}/stats`),
  versions: (id: string) =>
    DEMO
      ? Promise.resolve(mock.MOCK_VERSIONS[id] ?? [])
      : apiFetch<Version[]>(`/api/v0/assets/${id}/versions`),
  version: (id: string, vid: string) =>
    DEMO
      ? Promise.resolve((mock.MOCK_VERSIONS[id] ?? []).find((v) => v.id === vid) ?? null).then(
          (v) => {
            if (!v) throw new Error('not found');
            return v;
          },
        )
      : apiFetch<Version>(`/api/v0/assets/${id}/versions/${vid}`),
  render: (id: string, vid: string, body: { inputs?: Record<string, unknown>; save?: boolean }) =>
    DEMO
      ? Promise.resolve(mock.MOCK_RENDER)
      : apiPost<RenderResult>(`/api/v0/assets/${id}/versions/${vid}/render`, body),
  auditEvents: (id: string) =>
    DEMO
      ? Promise.resolve(mock.MOCK_AUDIT[id] ?? [])
      : apiFetch<AuditEvent[]>(`/api/v0/assets/${id}/audit`),
  updateAsset: (
    id: string,
    body: { description?: string; tags?: string[]; lifecycle?: Asset['lifecycle'] },
  ) =>
    DEMO
      ? Promise.reject(new Error('Read-only in demo mode'))
      : apiPatch<Asset>(`/api/v0/assets/${id}`, body),
};
