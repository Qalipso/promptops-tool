import { describe, expect, it } from 'vitest';
import { AssetIdSchema, SemverSchema, compareSemver, parseSemver } from './ids.js';

describe('AssetIdSchema', () => {
  it.each([
    'shadow.ops.daily-classifier',
    'area-mosa.booking.confirm',
    'sales.crm.lead-qualifier',
    'internal.eval.report-gen',
  ])('accepts valid asset id %s', (id) => {
    expect(AssetIdSchema.safeParse(id).success).toBe(true);
  });

  it.each([
    'Shadow.ops.daily-classifier',
    'shadow.ops.daily_classifier',
    'shadow.ops.daily-classifier.',
    'shadow.ops.daily-classifier.extra',
    'shadow.daily',
    '1shadow.daily.x',
  ])('rejects invalid asset id %s', (id) => {
    expect(AssetIdSchema.safeParse(id).success).toBe(false);
  });
});

describe('SemverSchema and helpers', () => {
  it('accepts canonical semver', () => {
    expect(SemverSchema.safeParse('1.2.3').success).toBe(true);
  });

  it('rejects prerelease suffix in MVP', () => {
    expect(SemverSchema.safeParse('1.2.3-beta').success).toBe(false);
  });

  it('parseSemver returns numeric parts', () => {
    expect(parseSemver('2.5.9')).toEqual({ major: 2, minor: 5, patch: 9 });
  });

  it('compareSemver orders versions correctly', () => {
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareSemver('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });
});
