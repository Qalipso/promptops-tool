import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
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
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function chainSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  return chain;
}

function chainInsert(row: unknown) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([row]),
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('listAssets', () => {
  it('returns rows from DB', async () => {
    const { db } = await import('../db/client.js');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockResolvedValue([{ id: 'a.b.c' }]),
    } as any);

    const { listAssets } = await import('./asset-repo.js');
    const result = await listAssets();
    expect(result).toEqual([{ id: 'a.b.c' }]);
  });
});

describe('getAsset', () => {
  it('returns row when found', async () => {
    const { db } = await import('../db/client.js');
    vi.mocked(db.select).mockReturnValue(chainSelect([{ id: 'a.b.c' }]) as any);

    const { getAsset } = await import('./asset-repo.js');
    const result = await getAsset('a.b.c');
    expect(result).toMatchObject({ id: 'a.b.c' });
  });

  it('throws not_found when missing', async () => {
    const { db } = await import('../db/client.js');
    vi.mocked(db.select).mockReturnValue(chainSelect([]) as any);

    const { getAsset } = await import('./asset-repo.js');
    await expect(getAsset('missing')).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('createAsset', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts and returns row', async () => {
    const { db } = await import('../db/client.js');
    const { writeAudit } = await import('./audit.js');

    // Existence check → not found
    vi.mocked(db.select).mockReturnValue(chainSelect([]) as any);
    // Insert → returns row
    vi.mocked(db.insert).mockReturnValue(chainInsert({ id: 'a.b.c', owner: 'actor' }) as any);

    const { createAsset } = await import('./asset-repo.js');
    const result = await createAsset(
      {
        id: 'a.b.c',
        owner: 'actor',
        variable_contract: [],
        output_contract: {},
        model_config: {},
      },
      'actor',
    );

    expect(result).toMatchObject({ id: 'a.b.c' });
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'asset.created', asset_id: 'a.b.c' }),
    );
  });

  it('throws conflict when asset exists', async () => {
    const { db } = await import('../db/client.js');
    vi.mocked(db.select).mockReturnValue(chainSelect([{ id: 'a.b.c' }]) as any);

    const { createAsset } = await import('./asset-repo.js');
    await expect(
      createAsset(
        {
          id: 'a.b.c',
          owner: 'actor',
          variable_contract: [],
          output_contract: {},
          model_config: {},
        },
        'actor',
      ),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});
