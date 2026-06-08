'use server';

import type { BuilderSpec, CompiledBody } from '@promptops/builder';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.PROMPTOPS_API_URL ?? 'http://127.0.0.1:3013';
const TOKEN = process.env.PROMPTOPS_API_TOKEN ?? '';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: headers(), cache: 'no-store' };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

/** Create a fresh asset then open it in the builder. */
export async function createBuilderAssetAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const id = (formData.get('id') as string).trim();
  const owner = (formData.get('owner') as string).trim();
  if (!id) return { error: 'Agent ID is required' };

  try {
    await call('POST', '/api/v0/assets', {
      id,
      owner: owner || undefined,
      lifecycle: 'unregistered',
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Create failed' };
  }
  revalidatePath('/');
  redirect(`/builder/${encodeURIComponent(id)}`);
}

/** Persist the wizard spec (autosave). */
export async function saveSpecAction(
  id: string,
  spec: BuilderSpec,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await call('PUT', `/api/v0/assets/${encodeURIComponent(id)}/builder-spec`, { spec });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export interface ActiveBody {
  version: string;
  body: { system?: string | null; developer?: string | null; user: string };
}

/** Fetch the current active version body (for diff-before-release). null if none. */
export async function getActiveBodyAction(id: string): Promise<ActiveBody | null> {
  try {
    const v = await call<{ version: string; body: ActiveBody['body'] }>(
      'GET',
      `/api/v0/assets/${enc(id)}/active`,
    );
    return { version: v.version, body: v.body };
  } catch {
    return null; // no active version yet, or API down
  }
}

/** Compile spec → prompt body for the preview step. */
export async function compileSpecAction(
  id: string,
  spec: BuilderSpec,
): Promise<{ body?: CompiledBody; error?: string }> {
  try {
    const body = await call<CompiledBody>(
      'POST',
      `/api/v0/assets/${encodeURIComponent(id)}/compile`,
      { spec },
    );
    return { body };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Compile failed' };
  }
}

// ── Test cases ────────────────────────────────────────────────────────────────

export interface TestCaseRow {
  id: string;
  name: string;
  input: Record<string, unknown>;
  note: string | null;
  source: string;
}

const enc = encodeURIComponent;

export async function listTestCasesAction(id: string): Promise<TestCaseRow[]> {
  try {
    return await call<TestCaseRow[]>('GET', `/api/v0/assets/${enc(id)}/test-cases`);
  } catch {
    return [];
  }
}

export async function generateTestsAction(
  id: string,
): Promise<{ created?: number; error?: string }> {
  try {
    const rows = await call<TestCaseRow[]>('POST', `/api/v0/assets/${enc(id)}/test-cases/generate`);
    return { created: rows.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Generate failed' };
  }
}

export async function deleteTestCaseAction(id: string, tid: string): Promise<{ ok: boolean }> {
  try {
    await call('DELETE', `/api/v0/assets/${enc(id)}/test-cases/${enc(tid)}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ── Eval import ─────────────────────────────────────────────────────────────

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
}
export interface EvalImportRow {
  id: string;
  filename: string | null;
  summary: EvalSummary;
  parsed: Array<{ name: string; status: 'pass' | 'fail'; score?: number; reason?: string }>;
  created_at: string;
}

export async function evalImportAction(
  id: string,
  raw: string,
  filename?: string,
): Promise<{ row?: EvalImportRow; error?: string }> {
  try {
    const row = await call<EvalImportRow>('POST', `/api/v0/assets/${enc(id)}/eval-import`, {
      raw,
      filename,
    });
    return { row };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Import failed' };
  }
}

export async function listEvalImportsAction(id: string): Promise<EvalImportRow[]> {
  try {
    return await call<EvalImportRow[]>('GET', `/api/v0/assets/${enc(id)}/eval-imports`);
  } catch {
    return [];
  }
}

// ── Release ───────────────────────────────────────────────────────────────────

/** Suggest the next patch version label from existing versions (avoids collisions). */
export async function nextVersionAction(id: string): Promise<string> {
  try {
    const versions = await call<Array<{ version: string }>>(
      'GET',
      `/api/v0/assets/${enc(id)}/versions`,
    );
    let best: [number, number, number] | null = null;
    for (const v of versions) {
      const m = v.version.match(/^(\d+)\.(\d+)\.(\d+)$/);
      if (!m) continue;
      const t: [number, number, number] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (
        !best ||
        t[0] > best[0] ||
        (t[0] === best[0] && t[1] > best[1]) ||
        (t[0] === best[0] && t[1] === best[1] && t[2] > best[2])
      ) {
        best = t;
      }
    }
    return best ? `${best[0]}.${best[1]}.${best[2] + 1}` : '0.1.0';
  } catch {
    return '0.1.0';
  }
}

export async function releaseVersionAction(
  id: string,
  spec: BuilderSpec,
  version: string,
  promote: boolean,
): Promise<{ ok: boolean; version?: string; vid?: string; error?: string }> {
  try {
    const body = await call<CompiledBody>('POST', `/api/v0/assets/${enc(id)}/compile`, { spec });
    const created = await call<{ id: string; version: string }>(
      'POST',
      `/api/v0/assets/${enc(id)}/versions`,
      {
        version,
        body: {
          system: body.system,
          developer: body.developer,
          user: body.user,
          tools: body.tools,
          output_schema: body.output_schema,
        },
        variable_contract_snapshot: [],
        model_config_snapshot: {},
        output_contract_snapshot: spec.output ?? {},
        changelog: `Built via wizard: ${spec.brief?.name ?? id}`,
      },
    );
    if (promote) {
      await call('POST', `/api/v0/assets/${enc(id)}/versions/${created.id}/promote`);
    }
    revalidatePath(`/assets/${id}`);
    return { ok: true, version: created.version, vid: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Release failed' };
  }
}
