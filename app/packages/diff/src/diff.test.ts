import { describe, expect, it } from 'vitest';
import { collapseEqual, diffLines, diffStats } from './lines.js';
import { diffObject, diffPromptBody, jsonEqual } from './structured.js';

describe('diffLines', () => {
  it('marks equal lines', () => {
    const d = diffLines('a\nb', 'a\nb');
    expect(d.every((l) => l.type === 'equal')).toBe(true);
  });

  it('detects add and remove', () => {
    const d = diffLines('a\nb', 'a\nc');
    const stats = diffStats(d);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
  });

  it('handles full insertion', () => {
    const d = diffLines('', 'x\ny');
    const stats = diffStats(d);
    expect(stats.added).toBe(2);
  });
});

describe('collapseEqual', () => {
  it('collapses long equal runs', () => {
    const lines = diffLines('1\n2\n3\n4\n5\n6\n7\n8\n9\n10', '1\n2\n3\n4\n5\n6\n7\n8\n9\nX');
    const collapsed = collapseEqual(lines, 2);
    expect(collapsed.some((l) => l.type === 'collapsed')).toBe(true);
  });
});

describe('diffPromptBody', () => {
  it('flags changed user field only', () => {
    const a = { system: 'sys', user: 'old' };
    const b = { system: 'sys', user: 'new' };
    const fields = diffPromptBody(a, b);
    const sys = fields.find((f) => f.field === 'system')!;
    const user = fields.find((f) => f.field === 'user')!;
    expect(sys.changed).toBe(false);
    expect(user.changed).toBe(true);
  });

  it('treats null system as empty', () => {
    const fields = diffPromptBody({ system: null, user: 'u' }, { system: '', user: 'u' });
    expect(fields.find((f) => f.field === 'system')!.changed).toBe(false);
  });
});

describe('diffObject', () => {
  it('detects added, removed, changed keys', () => {
    const changes = diffObject(
      { temperature: 0.7, model: 'a', drop: 1 },
      { temperature: 0.9, model: 'a', add: 2 },
    );
    const byKey = Object.fromEntries(changes.map((c) => [c.key, c.kind]));
    expect(byKey.temperature).toBe('changed');
    expect(byKey.drop).toBe('removed');
    expect(byKey.add).toBe('added');
    expect(byKey.model).toBeUndefined();
  });
});

describe('jsonEqual', () => {
  it('is key-order independent', () => {
    expect(jsonEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(jsonEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});
