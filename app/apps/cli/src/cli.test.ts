import { describe, expect, it } from 'vitest';
import { parseEditorBody, parseInputs } from './commands.js';
import { table } from './format.js';

describe('parseInputs', () => {
  it('parses key=value pairs', () => {
    expect(parseInputs(['a=1', 'b=hello'])).toEqual({ a: '1', b: 'hello' });
  });

  it('keeps = inside the value', () => {
    expect(parseInputs(['q=a=b'])).toEqual({ q: 'a=b' });
  });

  it('throws on missing =', () => {
    expect(() => parseInputs(['bad'])).toThrow(/expected key=value/);
  });

  it('returns empty object for no pairs', () => {
    expect(parseInputs([])).toEqual({});
  });
});

describe('parseEditorBody', () => {
  it('splits system and user on --- separator', () => {
    const { system, user } = parseEditorBody('You are X.\n---\nDo {{thing}}');
    expect(system).toBe('You are X.');
    expect(user).toBe('Do {{thing}}');
  });

  it('ignores comment lines', () => {
    const { system, user } = parseEditorBody('# comment\nsys\n---\n# c2\nusr');
    expect(system).toBe('sys');
    expect(user).toBe('usr');
  });

  it('treats whole body as user when no separator', () => {
    const { system, user } = parseEditorBody('just a user prompt');
    expect(system).toBeNull();
    expect(user).toBe('just a user prompt');
  });
});

describe('table', () => {
  it('renders header + aligned rows', () => {
    const out = table([{ id: 'a', n: '1' }], ['id', 'n']);
    expect(out).toContain('id');
    expect(out).toContain('a');
  });

  it('shows (none) for empty rows', () => {
    expect(table([], ['id'])).toContain('(none)');
  });
});
