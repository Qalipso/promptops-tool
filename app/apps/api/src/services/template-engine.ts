/**
 * Template engine — pure functions for variable interpolation.
 * No I/O, no LLM, fully unit-testable.
 *
 * Variable syntax: {{variable_name}}
 * Rules:
 *   - Names match [a-z][a-z0-9_]* (case-insensitive)
 *   - Unknown variables are left as-is in output
 *   - null/undefined inputs leave the placeholder intact
 */

const VAR_RE = /\{\{([a-z][a-z0-9_]*)\}\}/gi;

/**
 * Replaces {{variable_name}} placeholders with values from inputs.
 * Unknown variables (no matching key) are left as-is.
 */
export function interpolate(template: string, inputs: Record<string, unknown>): string {
  return template.replace(VAR_RE, (match, key: string) => {
    const val = inputs[key];
    if (val === undefined || val === null) return match;
    return String(val);
  });
}

/**
 * Returns all unique variable names referenced in a template string.
 * Order: first occurrence. Case-normalised to lowercase.
 */
export function extractVariables(template: string): string[] {
  const seen = new Set<string>();
  const re = new RegExp(VAR_RE.source, VAR_RE.flags);
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
  while ((match = re.exec(template)) !== null) {
    seen.add((match[1] as string).toLowerCase());
  }
  return [...seen];
}

/**
 * Returns variable names that remain unresolved (still `{{var}}` form)
 * in a rendered string. Used to detect missing inputs after interpolation.
 */
export function findUnresolved(rendered: string): string[] {
  const seen = new Set<string>();
  const re = new RegExp(VAR_RE.source, VAR_RE.flags);
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex exec loop
  while ((match = re.exec(rendered)) !== null) {
    seen.add((match[1] as string).toLowerCase());
  }
  return [...seen];
}

/**
 * Returns input keys that were provided but not referenced in any template variable.
 * Useful for surfacing inputs that will be silently ignored.
 *
 * @param inputs  - The full inputs map
 * @param usedVars - Variable names actually referenced in the template(s)
 */
export function findUnused(inputs: Record<string, unknown>, usedVars: string[]): string[] {
  const used = new Set(usedVars.map((v) => v.toLowerCase()));
  return Object.keys(inputs).filter((k) => !used.has(k.toLowerCase()));
}
