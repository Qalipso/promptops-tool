import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Open $EDITOR with `initial` content, return the edited text.
 * Falls back to nano, then vi. Throws if the editor exits non-zero.
 */
export function editInEditor(initial: string, filename = 'prompt.txt'): string {
  const editor = process.env.EDITOR ?? process.env.VISUAL ?? 'nano';
  const dir = mkdtempSync(join(tmpdir(), 'promptops-'));
  const file = join(dir, filename);
  writeFileSync(file, initial, 'utf8');

  const res = spawnSync(editor, [file], { stdio: 'inherit' });
  if (res.error) {
    throw new Error(`Failed to launch editor "${editor}": ${res.error.message}`);
  }
  if (typeof res.status === 'number' && res.status !== 0) {
    throw new Error(`Editor "${editor}" exited with status ${res.status}`);
  }
  return readFileSync(file, 'utf8');
}
