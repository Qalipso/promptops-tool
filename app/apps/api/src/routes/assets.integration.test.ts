/**
 * Integration test — real Hono app against a real (temp) SQLite DB.
 * No mocks: exercises routes → services → repos → schema end to end.
 * Local mode (PROMPTOPS_LOCAL=1) so no Bearer token needed.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Env MUST be set before importing client/env (parsed at module load).
const dir = mkdtempSync(join(tmpdir(), 'promptops-int-'));
process.env.PROMPTOPS_DB_PATH = join(dir, 'test.db');
process.env.PROMPTOPS_LOCAL = '1';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'fatal';

type App = { request: (path: string, init?: RequestInit) => Promise<Response> };
let app: App;

async function json(res: Response) {
  return (await res.json()) as { success: boolean; data: unknown; error?: unknown };
}
function post(_path: string, body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

beforeAll(async () => {
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const { db } = await import('../db/client.js');
  migrate(db, { migrationsFolder: '../../infra/migrations-sqlite' });
  const { buildApp } = await import('../app.js');
  app = buildApp() as unknown as App;
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const A = 'test.integration.agent';

describe('asset lifecycle (integration)', () => {
  it('health is ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('creates an asset', async () => {
    const res = await app.request(
      '/api/v0/assets',
      post('/api/v0/assets', { id: A, owner: 'tester', tags: ['x'], lifecycle: 'active' }),
    );
    expect(res.status).toBe(201);
    const body = await json(res);
    expect((body.data as { id: string }).id).toBe(A);
  });

  it('rejects duplicate asset with 409', async () => {
    const res = await app.request('/api/v0/assets', post('/api/v0/assets', { id: A }));
    expect(res.status).toBe(409);
  });

  it('lists assets with stats', async () => {
    const res = await app.request('/api/v0/assets');
    const body = await json(res);
    const list = body.data as Array<{ id: string; stats?: unknown }>;
    expect(list.some((a) => a.id === A)).toBe(true);
    expect(list.find((a) => a.id === A)?.stats).toBeDefined();
  });

  let versionId = '';

  it('creates a draft version', async () => {
    const res = await app.request(
      `/api/v0/assets/${A}/versions`,
      post(`/api/v0/assets/${A}/versions`, {
        version: '0.1.0',
        body: { system: 'You greet.', user: 'Hi {{name}}' },
        variable_contract_snapshot: [],
        model_config_snapshot: {},
        output_contract_snapshot: {},
        changelog: 'init',
      }),
    );
    expect(res.status).toBe(201);
    const v = (await json(res)).data as { id: string; state: string };
    expect(v.state).toBe('draft');
    versionId = v.id;
  });

  it('blocks a second draft with 409', async () => {
    const res = await app.request(
      `/api/v0/assets/${A}/versions`,
      post(`/api/v0/assets/${A}/versions`, {
        version: '0.2.0',
        body: { user: 'x' },
        variable_contract_snapshot: [],
        model_config_snapshot: {},
        output_contract_snapshot: {},
      }),
    );
    expect(res.status).toBe(409);
  });

  it('promotes the draft to active', async () => {
    const res = await app.request(
      `/api/v0/assets/${A}/versions/${versionId}/promote`,
      post(`/api/v0/assets/${A}/versions/${versionId}/promote`, {}),
    );
    expect(res.status).toBe(200);
    expect(((await json(res)).data as { state: string }).state).toBe('active');
  });

  it('returns the active version', async () => {
    const res = await app.request(`/api/v0/assets/${A}/active`);
    expect(res.status).toBe(200);
    expect(((await json(res)).data as { version: string }).version).toBe('0.1.0');
  });

  it('renders the version with inputs (no LLM)', async () => {
    const res = await app.request(
      `/api/v0/assets/${A}/versions/${versionId}/render`,
      post(`/api/v0/assets/${A}/versions/${versionId}/render`, {
        inputs: { name: 'Sam' },
        save: true,
      }),
    );
    expect(res.status).toBe(202);
    const r = (await json(res)).data as { rendered_user: string; unresolved_variables: string[] };
    expect(r.rendered_user).toBe('Hi Sam');
    expect(r.unresolved_variables).toEqual([]);
  });

  it('flags unresolved variables', async () => {
    const res = await app.request(
      `/api/v0/assets/${A}/versions/${versionId}/render`,
      post(`/api/v0/assets/${A}/versions/${versionId}/render`, { inputs: {} }),
    );
    const r = (await json(res)).data as { unresolved_variables: string[] };
    expect(r.unresolved_variables).toContain('name');
  });

  it('records audit events', async () => {
    const res = await app.request(`/api/v0/assets/${A}/audit`);
    const events = (await json(res)).data as Array<{ event_type: string }>;
    const types = events.map((e) => e.event_type);
    expect(types).toContain('asset.created');
    expect(types).toContain('version.created');
    expect(types).toContain('version.promoted');
  });

  it('reports stats', async () => {
    const res = await app.request(`/api/v0/assets/${A}/stats`);
    const s = (await json(res)).data as { version_count: number; last_rendered_at: string | null };
    expect(s.version_count).toBe(1);
    expect(s.last_rendered_at).not.toBeNull();
  });

  it('404s for unknown asset', async () => {
    const res = await app.request('/api/v0/assets/nope.nope');
    expect(res.status).toBe(404);
  });
});

describe('builder routes (integration)', () => {
  const SPEC = {
    brief: { name: 'Greeter', purpose: 'greet' },
    behavior: { persona: 'a greeter', tone: ['warm'], guardrails: ['never insult'] },
    rules: { items: [], constraints: [] },
    tools: [],
    output: { format: 'free_text' },
  };

  it('saves and compiles a builder spec', async () => {
    const save = await app.request(`/api/v0/assets/${A}/builder-spec`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ spec: SPEC }),
    });
    expect(save.status).toBe(200);

    const compile = await app.request(
      `/api/v0/assets/${A}/compile`,
      post(`/api/v0/assets/${A}/compile`, { spec: SPEC }),
    );
    expect(compile.status).toBe(200);
    const body = (await json(compile)).data as { system: string; user: string };
    expect(body.system).toContain('greeter');
    expect(body.user).toBe('{{input}}');
  });

  it('generates test cases from spec', async () => {
    const res = await app.request(
      `/api/v0/assets/${A}/test-cases/generate`,
      post(`/api/v0/assets/${A}/test-cases/generate`, {}),
    );
    expect(res.status).toBe(201);
    const rows = (await json(res)).data as Array<{ name: string }>;
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.map((r) => r.name)).toContain('happy-path');
  });

  it('imports and parses eval results', async () => {
    const raw = 'PASS 1 / FAIL 1\ncase: happy-path => PASS score 0.9\ncase: x => FAIL reason: bad';
    const res = await app.request(
      `/api/v0/assets/${A}/eval-import`,
      post(`/api/v0/assets/${A}/eval-import`, { raw, filename: 'r.txt' }),
    );
    expect(res.status).toBe(201);
    const row = (await json(res)).data as { summary: { passed: number; failed: number } };
    expect(row.summary.passed).toBe(1);
    expect(row.summary.failed).toBe(1);
  });
});
