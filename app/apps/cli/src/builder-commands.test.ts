import { afterEach, describe, expect, it, vi } from 'vitest';
import { cmdBuilderCompile, cmdBuilderTests } from './builder-commands.js';

function mockRes(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function captureStdout() {
  let buf = '';
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => {
    buf += String(s);
    return true;
  });
  return { get: () => buf, restore: () => spy.mockRestore() };
}

afterEach(() => vi.unstubAllGlobals());

describe('builder CLI', () => {
  it('compile prints system/developer/user from compiled body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockRes(200, {
          success: true,
          data: {
            system: 'You are X.',
            developer: 'Rules:',
            user: '{{input}}',
            tools: [],
            output_schema: null,
          },
        }),
      ),
    );
    const cap = captureStdout();
    await cmdBuilderCompile('a.b.c', undefined);
    cap.restore();
    expect(cap.get()).toContain('You are X.');
    expect(cap.get()).toContain('{{input}}');
  });

  it('tests reports generated count', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          mockRes(201, { success: true, data: [{ name: 'happy-path' }, { name: 'missing-info' }] }),
        ),
    );
    const cap = captureStdout();
    await cmdBuilderTests('a.b.c');
    cap.restore();
    expect(cap.get()).toContain('generated 2');
    expect(cap.get()).toContain('happy-path');
  });
});
