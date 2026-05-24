/**
 * Smoke test — hits GET /api/v0/assets without a real DB.
 * Uses in-process Hono app + mocked db.
 *
 * Run: pnpm test (vitest)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../app.js';

// ── Mock DB ────────────────────────────────────────────────────────────────
vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockResolvedValue([]),
      }),
      // Bare select().from() → returns rows
    }),
    execute: vi.fn().mockResolvedValue([]),
  },
}));

// ── Mock env ───────────────────────────────────────────────────────────────
vi.mock('../lib/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgres://test',
    PROMPTOPS_API_TOKEN: 'test-token-abcdef0123456789',
    OPENAI_API_KEY: undefined,
    MAX_USD_PER_RUN: 1,
    MAX_USD_PER_DAY: 5,
  },
}));

// ── Mock logger ────────────────────────────────────────────────────────────
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GET /health', () => {
  it('returns 200 when db mock succeeds', async () => {
    const app = buildApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body['status']).toBe('ok');
  });
});

describe('GET /api/v0/assets (authenticated)', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
  });

  it('rejects missing auth → 401', async () => {
    const res = await app.request('/api/v0/assets');
    expect(res.status).toBe(401);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('unauthorized');
  });

  it('rejects wrong token → 401', async () => {
    const res = await app.request('/api/v0/assets', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 200 + data array with valid token', async () => {
    // Rewire db mock to return empty array for this call
    const { db } = await import('../db/client.js');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    } as any);

    const res = await app.request('/api/v0/assets', {
      headers: { Authorization: 'Bearer test-token-abcdef0123456789' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('404 catch-all', () => {
  it('returns 404 for unknown route', async () => {
    const app = buildApp();
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
  });
});
