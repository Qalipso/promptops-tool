import { z } from 'zod';

/**
 * Asset ID format: <project>.<feature>.<purpose>
 * Lowercase segments, kebab-case within each segment, exactly 3 segments.
 * Examples: shadow.daily-classifier, area-mosa.booking-confirm
 */
export const AssetIdSchema = z
  .string()
  .min(3)
  .max(128)
  .regex(
    /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/,
    'Asset ID must follow <project>.<feature>.<purpose> (lowercase, kebab-case)',
  );

export type AssetId = z.infer<typeof AssetIdSchema>;

/** Semver MAJOR.MINOR.PATCH. No prerelease suffixes in MVP. */
export const SemverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Version must be MAJOR.MINOR.PATCH');

export type Semver = z.infer<typeof SemverSchema>;

export function parseSemver(v: Semver): { major: number; minor: number; patch: number } {
  const parts = v.split('.').map(Number);
  return { major: parts[0]!, minor: parts[1]!, patch: parts[2]! };
}

export function compareSemver(a: Semver, b: Semver): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}
