/**
 * Pure LCS-based line differ. No external dependencies.
 *
 * diffLines(a, b) returns an array of DiffLine objects describing
 * how to transform text `a` into text `b` line by line.
 */

export type DiffLine = {
  type: 'equal' | 'add' | 'remove';
  text: string;
};

/** Hard cap on lines per field to keep LCS O(n^2) tractable. */
const MAX_LINES = 500;

/**
 * Compute LCS length table for two arrays.
 * Returns a 2-D table `dp` where `dp[i][j]` = LCS length of a[0..i-1] vs b[0..j-1].
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
      }
    }
  }
  return dp;
}

/**
 * Back-track through the LCS table to produce a diff sequence.
 */
function backtrack(
  dp: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number,
  out: DiffLine[],
): void {
  if (i === 0 && j === 0) return;
  if (i === 0) {
    backtrack(dp, a, b, i, j - 1, out);
    out.push({ type: 'add', text: b[j - 1]! });
  } else if (j === 0) {
    backtrack(dp, a, b, i - 1, j, out);
    out.push({ type: 'remove', text: a[i - 1]! });
  } else if (a[i - 1] === b[j - 1]) {
    backtrack(dp, a, b, i - 1, j - 1, out);
    out.push({ type: 'equal', text: a[i - 1]! });
  } else if ((dp[i - 1]?.[j] ?? 0) >= (dp[i]?.[j - 1] ?? 0)) {
    backtrack(dp, a, b, i - 1, j, out);
    out.push({ type: 'remove', text: a[i - 1]! });
  } else {
    backtrack(dp, a, b, i, j - 1, out);
    out.push({ type: 'add', text: b[j - 1]! });
  }
}

/**
 * Diff two multi-line strings. Returns DiffLine[].
 * Falls back to full add/remove for texts beyond MAX_LINES.
 */
export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');

  // Fallback: too large for LCS — show full remove + add
  if (aLines.length > MAX_LINES || bLines.length > MAX_LINES) {
    return [
      ...aLines.map((text): DiffLine => ({ type: 'remove', text })),
      ...bLines.map((text): DiffLine => ({ type: 'add', text })),
    ];
  }

  const dp = lcsTable(aLines, bLines);
  const result: DiffLine[] = [];
  backtrack(dp, aLines, bLines, aLines.length, bLines.length, result);
  return result;
}

/**
 * Collapse runs of 'equal' lines longer than `context` into a single placeholder.
 * context = how many equal lines to keep before/after a change block.
 */
export type CollapsedLine = DiffLine | { type: 'collapsed'; count: number };

export function collapseEqual(lines: DiffLine[], context = 3): CollapsedLine[] {
  const out: CollapsedLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.type !== 'equal') {
      out.push(line);
      i++;
      continue;
    }

    // Find run of equal lines
    let runEnd = i;
    while (runEnd < lines.length && lines[runEnd]?.type === 'equal') {
      runEnd++;
    }
    const runLen = runEnd - i;

    if (runLen <= context * 2) {
      // Short run — keep all
      for (let k = i; k < runEnd; k++) out.push(lines[k]!);
    } else {
      // Long run — keep `context` at each end, collapse middle
      for (let k = i; k < i + context; k++) out.push(lines[k]!);
      out.push({ type: 'collapsed', count: runLen - context * 2 });
      for (let k = runEnd - context; k < runEnd; k++) out.push(lines[k]!);
    }

    i = runEnd;
  }

  return out;
}
