import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './client.js';
import { cmdList } from './commands.js';

function mockRes(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('GET unwraps the data envelope', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockRes(200, { success: true, data: [{ id: 'a' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await api.get<Array<{ id: string }>>('/assets');
    expect(data).toEqual([{ id: 'a' }]);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toMatch(/\/api\/v0\/assets$/);
  });

  it('POST sends a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockRes(201, { success: true, data: { id: 'x' } }));
    vi.stubGlobal('fetch', fetchMock);

    await api.post('/assets', { id: 'x' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ id: 'x' }));
  });

  it('throws ApiError with status on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockRes(404, { success: false, error: 'nope' })),
    );
    await expect(api.get('/assets/x')).rejects.toMatchObject({ status: 404 });
  });

  it('wraps network failure as ApiError(0)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(api.get('/assets')).rejects.toBeInstanceOf(ApiError);
    await expect(api.get('/assets')).rejects.toMatchObject({ status: 0 });
  });
});

describe('cmdList (command + network)', () => {
  it('prints a table of assets fetched from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockRes(200, {
          success: true,
          data: [
            {
              id: 'shadow.classify',
              lifecycle: 'active',
              owner: 'me',
              stats: { version_count: 3 },
            },
          ],
        }),
      ),
    );
    let outBuf = '';
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => {
      outBuf += String(s);
      return true;
    });

    await cmdList();

    spy.mockRestore();
    expect(outBuf).toContain('shadow.classify');
    expect(outBuf).toContain('active');
  });
});
