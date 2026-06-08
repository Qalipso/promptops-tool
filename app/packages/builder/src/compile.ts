/**
 * compileSpec — deterministic, pure: BuilderSpec → prompt version body.
 * Same spec always yields the same body (no timestamps, no randomness),
 * so a re-compile is diff-stable against the previous version.
 */
import type { BuilderSpec, ToolDef } from './spec.js';

export interface CompiledBody {
  /** System prompt — identity, tone, guardrails. */
  system: string;
  /** Developer prompt — operating rules, constraints, tool guidance. */
  developer: string;
  /** User template — generic input placeholder. */
  user: string;
  /** Tool definitions carried through to the runtime. */
  tools: ToolDef[];
  /** Output contract schema when JSON output is required. */
  output_schema: unknown;
}

function bullet(items: string[]): string {
  return items
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `- ${s}`)
    .join('\n');
}

function compileSystem(spec: BuilderSpec): string {
  const { brief, behavior } = spec;
  const parts: string[] = [];

  const persona = behavior.persona.trim() || `${brief.name || 'An assistant'}`;
  parts.push(`You are ${persona}.`);
  if (brief.purpose.trim()) parts.push(brief.purpose.trim());
  if (brief.audience?.trim()) parts.push(`You assist ${brief.audience.trim()}.`);

  if (behavior.tone.length > 0) {
    parts.push(`Tone: ${behavior.tone.join(', ')}.`);
  }
  if (behavior.language?.trim()) {
    parts.push(`Always reply in ${behavior.language.trim()}.`);
  }
  if (brief.context?.trim()) {
    parts.push(`\nContext:\n${brief.context.trim()}`);
  }
  if (behavior.guardrails.length > 0) {
    parts.push(`\nNever:\n${bullet(behavior.guardrails)}`);
  }
  return parts.join('\n');
}

function compileDeveloper(spec: BuilderSpec): string {
  const { rules, tools, output } = spec;
  const sections: string[] = [];

  if (rules.items.length > 0) {
    const lines = rules.items.map((r) => `- When ${r.when.trim()}, ${r.then.trim()}`).join('\n');
    sections.push(`Rules:\n${lines}`);
  }
  if (rules.constraints.length > 0) {
    sections.push(`Constraints:\n${bullet(rules.constraints)}`);
  }
  if (tools.length > 0) {
    const lines = tools.map((t) => `- ${t.name}: ${t.description.trim()}`).join('\n');
    sections.push(`Tools available (call when appropriate, never invent results):\n${lines}`);
  }
  if (output.format === 'json') {
    const schema = output.schema === undefined ? 'a JSON object' : JSON.stringify(output.schema);
    sections.push(`Output: respond ONLY with valid JSON matching ${schema}.`);
  } else {
    sections.push('Output: respond in plain text.');
  }
  return sections.join('\n\n');
}

export function compileSpec(spec: BuilderSpec): CompiledBody {
  return {
    system: compileSystem(spec),
    developer: compileDeveloper(spec),
    user: '{{input}}',
    tools: spec.tools,
    output_schema: spec.output.format === 'json' ? (spec.output.schema ?? null) : null,
  };
}
