/** Terminal output helpers — no color deps, plain ANSI. */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function wrap(code: string, s: string): string {
  return useColor ? `\u001b[${code}m${s}\u001b[0m` : s;
}

export const c = {
  bold: (s: string) => wrap('1', s),
  dim: (s: string) => wrap('2', s),
  green: (s: string) => wrap('32', s),
  yellow: (s: string) => wrap('33', s),
  red: (s: string) => wrap('31', s),
  cyan: (s: string) => wrap('36', s),
};

export function out(s = ''): void {
  process.stdout.write(`${s}\n`);
}

export function err(s: string): void {
  process.stderr.write(`${c.red('error')} ${s}\n`);
}

/** Render an array of objects as an aligned text table. */
export function table(rows: Record<string, string>[], columns: string[]): string {
  if (rows.length === 0) return c.dim('(none)');
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => (r[col] ?? '').length)),
  );
  const header = columns.map((col, i) => c.bold(col.padEnd(widths[i]!))).join('  ');
  const body = rows
    .map((r) => columns.map((col, i) => (r[col] ?? '').padEnd(widths[i]!)).join('  '))
    .join('\n');
  return `${header}\n${body}`;
}

export function stateColor(state: string): string {
  switch (state) {
    case 'active':
      return c.green(state);
    case 'draft':
      return c.yellow(state);
    case 'archived':
    case 'sunset':
    case 'deprecated':
      return c.dim(state);
    default:
      return state;
  }
}
