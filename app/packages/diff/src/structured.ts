/**
 * Structured diffs for prompt versions — body fields, model config, and
 * arbitrary JSON contracts. Built on the line differ.
 */
import { type DiffLine, diffLines, diffStats } from './lines.js';

export interface PromptBody {
  system?: string | null | undefined;
  user: string;
}

export interface FieldDiff {
  field: string;
  changed: boolean;
  lines: DiffLine[];
  added: number;
  removed: number;
}

function fieldDiff(field: string, a: string, b: string): FieldDiff {
  const lines = diffLines(a, b);
  const { added, removed } = diffStats(lines);
  return { field, changed: a !== b, lines, added, removed };
}

/** Diff the system + user fields of two prompt bodies. */
export function diffPromptBody(a: PromptBody, b: PromptBody): FieldDiff[] {
  return [
    fieldDiff('system', a.system ?? '', b.system ?? ''),
    fieldDiff('user', a.user ?? '', b.user ?? ''),
  ];
}

export type JsonChangeKind = 'added' | 'removed' | 'changed';

export interface JsonChange {
  key: string;
  kind: JsonChangeKind;
  before?: unknown;
  after?: unknown;
}

/** Stable JSON stringify with sorted keys — deterministic comparison. */
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`).join(',')}}`;
}

/**
 * Shallow key-level diff between two flat objects (e.g. model_config).
 * Nested values are compared by stable stringify.
 */
export function diffObject(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): JsonChange[] {
  const left = a ?? {};
  const right = b ?? {};
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  const changes: JsonChange[] = [];
  for (const key of keys) {
    const inA = key in left;
    const inB = key in right;
    if (inA && !inB) {
      changes.push({ key, kind: 'removed', before: left[key] });
    } else if (!inA && inB) {
      changes.push({ key, kind: 'added', after: right[key] });
    } else if (stable(left[key]) !== stable(right[key])) {
      changes.push({ key, kind: 'changed', before: left[key], after: right[key] });
    }
  }
  return changes;
}

/** True if two arbitrary JSON values are structurally equal. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}
