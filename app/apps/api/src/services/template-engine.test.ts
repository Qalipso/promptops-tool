import { describe, expect, it } from 'vitest';
import { extractVariables, findUnresolved, findUnused, interpolate } from './template-engine.js';

// ── interpolate ───────────────────────────────────────────────────────────────

describe('interpolate', () => {
  it('replaces a known variable', () => {
    expect(interpolate('Hello {{name}}!', { name: 'Alice' })).toBe('Hello Alice!');
  });

  it('leaves unknown variables as-is', () => {
    expect(interpolate('Hi {{unknown}}', {})).toBe('Hi {{unknown}}');
  });

  it('replaces multiple occurrences of same variable', () => {
    expect(interpolate('{{a}} and {{a}}', { a: 'X' })).toBe('X and X');
  });

  it('replaces multiple different variables', () => {
    expect(interpolate('{{a}} {{b}}', { a: 'foo', b: 'bar' })).toBe('foo bar');
  });

  it('leaves placeholder when value is null', () => {
    expect(interpolate('{{x}}', { x: null })).toBe('{{x}}');
  });

  it('leaves placeholder when value is undefined', () => {
    expect(interpolate('{{x}}', { x: undefined })).toBe('{{x}}');
  });

  it('converts numeric values to string', () => {
    expect(interpolate('Count: {{n}}', { n: 42 })).toBe('Count: 42');
  });

  it('converts boolean values to string', () => {
    expect(interpolate('Flag: {{f}}', { f: true })).toBe('Flag: true');
  });

  it('handles template with no variables', () => {
    expect(interpolate('No variables here.', {})).toBe('No variables here.');
  });

  it('handles empty template', () => {
    expect(interpolate('', { x: 'y' })).toBe('');
  });

  it('is case-insensitive for variable names', () => {
    // VAR_RE uses /gi — matches {{Name}} with input key "name"
    expect(interpolate('{{Name}}', { Name: 'Alice' })).toBe('Alice');
  });
});

// ── extractVariables ──────────────────────────────────────────────────────────

describe('extractVariables', () => {
  it('extracts a single variable', () => {
    expect(extractVariables('Hello {{name}}')).toEqual(['name']);
  });

  it('extracts multiple distinct variables', () => {
    const vars = extractVariables('{{a}} {{b}} {{c}}');
    expect(vars).toEqual(['a', 'b', 'c']);
  });

  it('deduplicates repeated variables', () => {
    const vars = extractVariables('{{x}} and {{x}} again');
    expect(vars).toEqual(['x']);
  });

  it('returns empty array for template with no variables', () => {
    expect(extractVariables('No vars here.')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractVariables('')).toEqual([]);
  });

  it('lowercases variable names', () => {
    const vars = extractVariables('{{Name}} {{NAME}}');
    expect(vars).toEqual(['name']);
  });
});

// ── findUnresolved ────────────────────────────────────────────────────────────

describe('findUnresolved', () => {
  it('finds remaining placeholders after interpolation', () => {
    const rendered = interpolate('{{a}} {{b}}', { a: 'hello' });
    expect(findUnresolved(rendered)).toEqual(['b']);
  });

  it('returns empty array when all variables resolved', () => {
    const rendered = interpolate('{{a}} {{b}}', { a: 'x', b: 'y' });
    expect(findUnresolved(rendered)).toEqual([]);
  });

  it('returns empty array for text with no placeholders', () => {
    expect(findUnresolved('No placeholders here.')).toEqual([]);
  });

  it('deduplicates repeated unresolved variables', () => {
    const unresolved = findUnresolved('{{x}} and {{x}}');
    expect(unresolved).toEqual(['x']);
  });

  it('returns all unresolved when inputs are empty', () => {
    const rendered = interpolate('{{a}} {{b}} {{c}}', {});
    const unresolved = findUnresolved(rendered);
    expect(unresolved.sort()).toEqual(['a', 'b', 'c']);
  });
});

// ── findUnused ────────────────────────────────────────────────────────────────

describe('findUnused', () => {
  it('finds unused input keys', () => {
    const unused = findUnused({ name: 'Alice', extra: 'ignored' }, ['name']);
    expect(unused).toEqual(['extra']);
  });

  it('returns empty array when all inputs are used', () => {
    const unused = findUnused({ a: 1, b: 2 }, ['a', 'b']);
    expect(unused).toEqual([]);
  });

  it('returns all keys when usedVars is empty', () => {
    const unused = findUnused({ a: 1, b: 2 }, []);
    expect(unused.sort()).toEqual(['a', 'b']);
  });

  it('returns empty array when inputs is empty', () => {
    const unused = findUnused({}, ['a', 'b']);
    expect(unused).toEqual([]);
  });

  it('is case-insensitive for comparison', () => {
    const unused = findUnused({ Name: 'Alice' }, ['name']);
    expect(unused).toEqual([]);
  });
});
