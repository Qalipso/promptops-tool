/**
 * Render service — orchestrates template rendering.
 * No LLM call. Template substitution only. Manual inputs only (fixtures removed).
 *
 * PromptOps stores prompt versions. AI Eval scores model outputs.
 */
import { createHash } from 'node:crypto';
import { db } from '../db/client.js';
import { renderValidations } from '../db/schema.js';
import { interpolate, extractVariables, findUnresolved, findUnused } from './template-engine.js';
import { getVersion } from './version-repo.js';
import { writeAudit } from './audit.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PromptBody {
  system?: string | null | undefined;
  user: string;
}

export interface RenderResult {
  version_id: string;
  inputs: Record<string, unknown>;
  rendered_system: string | null;
  rendered_user: string;
  /** SHA256(rendered_system + ':' + rendered_user) — proves exactly what was rendered */
  rendered_hash: string;
  /** Template variables still present ({{var}}) after substitution — missing inputs */
  unresolved_variables: string[];
  /** Input keys not referenced in the template — silently ignored inputs */
  unused_inputs: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashRendered(system: string | null, user: string): string {
  return createHash('sha256')
    .update(`${system ?? ''}:${user}`)
    .digest('hex');
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function renderVersion(opts: {
  version_id: string;
  inputs?: Record<string, unknown> | undefined;
  actor: string;
  save?: boolean | undefined;
}): Promise<RenderResult> {
  const version = await getVersion(opts.version_id);
  const body = version.body as PromptBody;
  const mergedInputs: Record<string, unknown> = opts.inputs ?? {};

  // Extract all variable names referenced in system + user templates
  const systemTemplate = body.system ?? null;
  const userTemplate = body.user;
  const allTemplateVars = [
    ...extractVariables(systemTemplate ?? ''),
    ...extractVariables(userTemplate),
  ];
  const uniqueTemplateVars = [...new Set(allTemplateVars)];

  // Interpolate variables into templates
  const rendered_system = systemTemplate ? interpolate(systemTemplate, mergedInputs) : null;
  const rendered_user = interpolate(userTemplate, mergedInputs);

  // Diagnostics
  const combined_rendered = `${rendered_system ?? ''}\n${rendered_user}`;
  const unresolved_variables = findUnresolved(combined_rendered);
  const unused_inputs = findUnused(mergedInputs, uniqueTemplateVars);

  // Reproducibility hash
  const rendered_hash = hashRendered(rendered_system, rendered_user);

  const result: RenderResult = {
    version_id: opts.version_id,
    inputs: mergedInputs,
    rendered_system,
    rendered_user,
    rendered_hash,
    unresolved_variables,
    unused_inputs,
  };

  // Optionally persist to render_validations
  if (opts.save) {
    const [saved] = await db
      .insert(renderValidations)
      .values({
        version_id: opts.version_id,
        fixture_id: null,
        source: 'manual',
        inputs_snapshot: mergedInputs,
        rendered_system: rendered_system ?? null,
        rendered_user,
        rendered_hash,
        checks_config: [],
        render_check_results: [],
        unresolved_variables,
        unused_inputs,
        created_by: opts.actor,
      })
      .returning();

    await writeAudit({
      actor: opts.actor,
      event_type: 'render_validation.created',
      asset_id: version.asset_id,
      version_id: opts.version_id,
      payload: {
        id: saved!.id,
        rendered_hash,
        unresolved_count: unresolved_variables.length,
      },
    });

    await writeAudit({
      actor: opts.actor,
      event_type: 'version.rendered',
      asset_id: version.asset_id,
      version_id: opts.version_id,
      payload: { rendered_hash },
    });
  }

  return result;
}
