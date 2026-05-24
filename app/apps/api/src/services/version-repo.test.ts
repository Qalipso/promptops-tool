import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('./audit.js', () => ({ writeAudit: vi.fn() }));

vi.mock('../lib/errors.js', () => ({
  errors: {
    notFound: (msg: string) => Object.assign(new Error(msg), { code: 'not_found', status: 404 }),
    conflict: (msg: string) => Object.assign(new Error(msg), { code: 'conflict', status: 409 }),
    badRequest: (msg: string) => Object.assign(new Error(msg), { code: 'bad_request', status: 400 }),
  },
}));

function chainSelect(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

describe('promoteVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws bad_request when version not in draft state', async () => {
    const { db } = await import('../db/client.js');

    // getVersion returns active (not draft)
    vi.mocked(db.select).mockReturnValue(
      chainSelect([{ id: 'vid', asset_id: 'a.b.c', state: 'active', version: '1.0.0' }]) as any,
    );

    const { promoteVersion } = await import('./version-repo.js');
    await expect(promoteVersion('vid', 'actor')).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('throws not_found when version missing', async () => {
    const { db } = await import('../db/client.js');
    vi.mocked(db.select).mockReturnValue(chainSelect([]) as any);

    const { promoteVersion } = await import('./version-repo.js');
    await expect(promoteVersion('missing', 'actor')).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('createVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws conflict when draft already exists', async () => {
    const { db } = await import('../db/client.js');

    const calls: number[] = [];
    vi.mocked(db.select).mockImplementation(() => {
      const n = calls.push(1);
      if (n === 1) {
        // getDraftVersion → draft exists
        return chainSelect([{ id: 'draft-id', state: 'draft', version: '0.1.0' }]) as any;
      }
      return chainSelect([]) as any;
    });

    const { createVersion } = await import('./version-repo.js');
    await expect(
      createVersion(
        {
          asset_id: 'a.b.c',
          version: '0.2.0',
          body: { user: 'Hello {{user_name}}' },
          variable_contract_snapshot: [],
          model_config_snapshot: {},
          output_contract_snapshot: {},
          author: 'actor',
        },
        'actor',
      ),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});
