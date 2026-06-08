import { describe, expect, it } from 'vitest';
import { compileSpec } from './compile.js';
import { parseEval } from './eval.js';
import { type BuilderSpec, emptySpec } from './spec.js';
import { generateTestCases } from './testcases.js';

function sampleSpec(): BuilderSpec {
  return {
    brief: {
      name: 'Booking Assistant',
      purpose: 'Book salon appointments.',
      audience: 'salon clients',
      context: 'Open Mon-Sat 9-18.',
    },
    behavior: {
      persona: 'a friendly salon booking assistant',
      tone: ['friendly', 'concise'],
      language: 'English',
      guardrails: ['never confirm a slot outside opening hours'],
    },
    rules: {
      items: [{ when: 'the client gives no date', then: 'ask for a preferred date' }],
      constraints: ['always confirm name and phone'],
    },
    tools: [
      {
        name: 'check_availability',
        description: 'Check open slots for a date',
        params: [{ name: 'date', type: 'string', required: true }],
      },
    ],
    output: { format: 'free_text' },
  };
}

describe('compileSpec', () => {
  it('is deterministic', () => {
    const s = sampleSpec();
    expect(compileSpec(s)).toEqual(compileSpec(s));
  });

  it('puts persona, tone, guardrails in system', () => {
    const b = compileSpec(sampleSpec());
    expect(b.system).toContain('friendly salon booking assistant');
    expect(b.system).toContain('friendly, concise');
    expect(b.system).toContain('outside opening hours');
  });

  it('puts rules, constraints, tools in developer', () => {
    const b = compileSpec(sampleSpec());
    expect(b.developer).toContain('When the client gives no date');
    expect(b.developer).toContain('always confirm name and phone');
    expect(b.developer).toContain('check_availability');
  });

  it('carries tools and uses generic user template', () => {
    const b = compileSpec(sampleSpec());
    expect(b.user).toBe('{{input}}');
    expect(b.tools).toHaveLength(1);
    expect(b.output_schema).toBeNull();
  });

  it('emits JSON output instruction + schema when format=json', () => {
    const s = sampleSpec();
    s.output = { format: 'json', schema: { slot: 'string' } };
    const b = compileSpec(s);
    expect(b.developer).toContain('valid JSON');
    expect(b.output_schema).toEqual({ slot: 'string' });
  });

  it('handles empty spec without throwing', () => {
    expect(() => compileSpec(emptySpec())).not.toThrow();
  });
});

describe('generateTestCases', () => {
  it('produces baseline categories + one probe per guardrail', () => {
    const cases = generateTestCases(sampleSpec());
    const names = cases.map((c) => c.name);
    expect(names).toContain('happy-path');
    expect(names).toContain('missing-info');
    expect(names).toContain('out-of-scope');
    expect(names).toContain('ambiguous');
    expect(names).toContain('guardrail-1');
  });

  it('references a required tool param in missing-info', () => {
    const mi = generateTestCases(sampleSpec()).find((c) => c.name === 'missing-info')!;
    expect(mi.note).toContain('date');
  });
});

describe('parseEval', () => {
  it('parses case lines with score + reason', () => {
    const raw = [
      'case: happy-path => PASS score 0.92',
      'missing-name: FAIL score 0.41 reason: dropped slot',
    ].join('\n');
    const r = parseEval(raw);
    expect(r.total).toBe(2);
    expect(r.passed).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.cases[1]!.reason).toBe('dropped slot');
    expect(r.cases[0]!.score).toBeCloseTo(0.92);
  });

  it('prefers explicit summary line for totals', () => {
    const raw = ['PASS 12 / FAIL 3', 'case: x => PASS'].join('\n');
    const r = parseEval(raw);
    expect(r.passed).toBe(12);
    expect(r.failed).toBe(3);
    expect(r.total).toBe(15);
    expect(r.pass_rate).toBeCloseTo(12 / 15);
  });

  it('ignores noise lines', () => {
    const r = parseEval('hello world\n====\nrandom');
    expect(r.total).toBe(0);
  });
});
