import { type DiffLine, diffObject, diffPromptBody } from '@promptops/diff';
import { api } from './client.js';
import { editInEditor } from './editor.js';
import { c, out, stateColor, table } from './format.js';
import type { Asset, AuditEvent, RenderResult, Version } from './types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveVersion(assetId: string, versionLabel: string): Promise<Version> {
  const versions = await api.get<Version[]>(`/assets/${assetId}/versions`);
  const match = versions.find((v) => v.version === versionLabel);
  if (!match) {
    const known = versions.map((v) => v.version).join(', ') || '(none)';
    throw new Error(`Version '${versionLabel}' not found for '${assetId}'. Known: ${known}`);
  }
  return match;
}

export function parseInputs(pairs: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq === -1) throw new Error(`Invalid --input '${pair}', expected key=value`);
    obj[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return obj;
}

// ── Assets ──────────────────────────────────────────────────────────────────

export async function cmdList(): Promise<void> {
  const assets = await api.get<Asset[]>('/assets');
  const rows = assets.map((a) => ({
    id: a.id,
    lifecycle: stateColor(a.lifecycle),
    versions: String(a.stats?.version_count ?? 0),
    owner: a.owner,
  }));
  out(table(rows, ['id', 'lifecycle', 'versions', 'owner']));
}

export async function cmdShow(assetId: string): Promise<void> {
  const asset = await api.get<Asset>(`/assets/${assetId}`);
  const versions = await api.get<Version[]>(`/assets/${assetId}/versions`);
  out(c.bold(asset.id));
  out(`${c.dim('owner')}      ${asset.owner}`);
  out(`${c.dim('lifecycle')}  ${stateColor(asset.lifecycle)}`);
  out(`${c.dim('tags')}       ${asset.tags.join(', ') || c.dim('(none)')}`);
  out(`${c.dim('desc')}       ${asset.description || c.dim('(none)')}`);
  out('');
  out(c.bold('versions'));
  const rows = versions
    .sort((a, b) => a.version.localeCompare(b.version))
    .map((v) => ({
      version: v.version,
      state: stateColor(v.state),
      hash: v.body_hash.slice(0, 8),
      author: v.author,
      created: v.created_at.slice(0, 19).replace('T', ' '),
    }));
  out(table(rows, ['version', 'state', 'hash', 'author', 'created']));
}

export async function cmdNew(
  assetId: string,
  flags: {
    owner?: string | undefined;
    desc?: string | undefined;
    tags?: string | undefined;
    lifecycle?: string | undefined;
  },
): Promise<void> {
  const created = await api.post<Asset>('/assets', {
    id: assetId,
    owner: flags.owner,
    description: flags.desc,
    tags: flags.tags ? flags.tags.split(',').map((t) => t.trim()) : undefined,
    lifecycle: flags.lifecycle,
  });
  out(`${c.green('created')} asset ${c.bold(created.id)} (${stateColor(created.lifecycle)})`);
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function cmdVersionList(assetId: string): Promise<void> {
  const versions = await api.get<Version[]>(`/assets/${assetId}/versions`);
  const rows = versions.map((v) => ({
    version: v.version,
    state: stateColor(v.state),
    hash: v.body_hash.slice(0, 8),
    changelog: v.changelog ?? '',
  }));
  out(table(rows, ['version', 'state', 'hash', 'changelog']));
}

export async function cmdVersionShow(assetId: string, versionLabel: string): Promise<void> {
  const v = await resolveVersion(assetId, versionLabel);
  out(`${c.bold(`${assetId}@${v.version}`)}  ${stateColor(v.state)}`);
  out(`${c.dim('id')}        ${v.id}`);
  out(`${c.dim('hash')}      ${v.body_hash}`);
  out(`${c.dim('author')}    ${v.author}`);
  out(`${c.dim('changelog')} ${v.changelog ?? c.dim('(none)')}`);
  out('');
  if (v.body.system) {
    out(c.bold('system'));
    out(v.body.system);
    out('');
  }
  out(c.bold('user'));
  out(v.body.user);
}

const VERSION_TEMPLATE = `# Lines starting with '#' are ignored.
# First the SYSTEM prompt, then a line containing only '---', then the USER prompt.
# Use {{variable}} placeholders for inputs.

You are a helpful assistant.
---
{{input}}
`;

export function parseEditorBody(text: string): { system: string | null; user: string } {
  const lines = text.split('\n').filter((l) => !l.startsWith('#'));
  const body = lines.join('\n');
  const sep = body.indexOf('\n---\n');
  if (sep === -1) {
    return { system: null, user: body.trim() };
  }
  const system = body.slice(0, sep).trim();
  const user = body.slice(sep + 5).trim();
  return { system: system || null, user };
}

export async function cmdVersionNew(
  assetId: string,
  versionLabel: string,
  flags: {
    message?: string | undefined;
    user?: string | undefined;
    system?: string | undefined;
  },
): Promise<void> {
  // Pull current contracts from the asset → snapshot defaults.
  const asset = await api.get<Asset>(`/assets/${assetId}`);

  let body: { system: string | null; user: string };
  if (flags.user) {
    body = { system: flags.system ?? null, user: flags.user };
  } else {
    const edited = editInEditor(VERSION_TEMPLATE, `${assetId}-${versionLabel}.txt`);
    body = parseEditorBody(edited);
    if (!body.user) throw new Error('Aborted: user prompt is empty.');
  }

  const created = await api.post<Version>(`/assets/${assetId}/versions`, {
    version: versionLabel,
    body,
    variable_contract_snapshot: asset.variable_contract ?? [],
    model_config_snapshot: asset.model_config ?? {},
    output_contract_snapshot: asset.output_contract ?? {},
    changelog: flags.message,
  });
  out(
    `${c.green('created')} ${c.bold(`${assetId}@${created.version}`)} ` +
      `${stateColor(created.state)} ${c.dim(created.body_hash.slice(0, 8))}`,
  );
  out(`${c.dim('Promote it with:')} promptops promote ${assetId} ${created.version}`);
}

export async function cmdPromote(assetId: string, versionLabel: string): Promise<void> {
  const v = await resolveVersion(assetId, versionLabel);
  const promoted = await api.post<Version>(`/assets/${assetId}/versions/${v.id}/promote`);
  out(
    `${c.green('promoted')} ${c.bold(`${assetId}@${promoted.version}`)} → ${stateColor('active')}`,
  );
}

export async function cmdArchive(assetId: string, versionLabel: string): Promise<void> {
  const v = await resolveVersion(assetId, versionLabel);
  const archived = await api.post<Version>(`/assets/${assetId}/versions/${v.id}/archive`);
  out(`${c.yellow('archived')} ${c.bold(`${assetId}@${archived.version}`)}`);
}

export async function cmdRollback(
  assetId: string,
  flags: { reason?: string | undefined },
): Promise<void> {
  const reason = flags.reason;
  if (!reason) throw new Error('--reason is required for rollback (audit justification).');
  const restored = await api.post<Version>(`/assets/${assetId}/rollback`, {
    justification: reason,
  });
  out(`${c.green('rolled back')} ${c.bold(assetId)} → active ${c.bold(restored.version)}`);
}

export async function cmdActive(assetId: string): Promise<void> {
  const v = await api.get<Version>(`/assets/${assetId}/active`);
  out(
    `${c.bold(`${assetId}@${v.version}`)}  ${stateColor(v.state)}  ${c.dim(v.body_hash.slice(0, 8))}`,
  );
}

// ── Render ──────────────────────────────────────────────────────────────────

export async function cmdRender(
  assetId: string,
  versionLabel: string,
  flags: { input: string[]; save?: boolean | undefined },
): Promise<void> {
  const v = await resolveVersion(assetId, versionLabel);
  const inputs = parseInputs(flags.input);
  const result = await api.post<RenderResult>(`/assets/${assetId}/versions/${v.id}/render`, {
    inputs,
    save: flags.save ?? false,
  });

  if (result.rendered_system) {
    out(c.bold('system'));
    out(result.rendered_system);
    out('');
  }
  out(c.bold('user'));
  out(result.rendered_user);
  out('');
  out(`${c.dim('hash')} ${result.rendered_hash.slice(0, 12)}`);
  if (result.unresolved_variables.length > 0) {
    out(`${c.yellow('unresolved')} ${result.unresolved_variables.join(', ')}`);
  }
  if (result.unused_inputs.length > 0) {
    out(`${c.dim('unused inputs')} ${result.unused_inputs.join(', ')}`);
  }
  if (flags.save) out(c.green('saved render validation'));
}

// ── Diff ──────────────────────────────────────────────────────────────────────

function printDiffLines(lines: DiffLine[]): void {
  for (const l of lines) {
    if (l.type === 'add') out(c.green(`+ ${l.text}`));
    else if (l.type === 'remove') out(c.red(`- ${l.text}`));
    else out(c.dim(`  ${l.text}`));
  }
}

export async function cmdDiff(assetId: string, labelA: string, labelB: string): Promise<void> {
  const a = await resolveVersion(assetId, labelA);
  const b = await resolveVersion(assetId, labelB);

  out(`${c.bold(`${assetId}`)}  ${c.red(labelA)} → ${c.green(labelB)}`);
  out('');

  const fields = diffPromptBody(a.body, b.body);
  for (const f of fields) {
    const tag = f.changed ? c.yellow(`~ ${f.added}+ ${f.removed}-`) : c.dim('unchanged');
    out(`${c.bold(f.field)}  ${tag}`);
    if (f.changed) printDiffLines(f.lines);
    out('');
  }

  const cfg = diffObject(
    a.model_config_snapshot as Record<string, unknown>,
    b.model_config_snapshot as Record<string, unknown>,
  );
  out(c.bold('model_config'));
  if (cfg.length === 0) {
    out(c.dim('  unchanged'));
  } else {
    for (const ch of cfg) {
      if (ch.kind === 'added') out(c.green(`+ ${ch.key} = ${JSON.stringify(ch.after)}`));
      else if (ch.kind === 'removed') out(c.red(`- ${ch.key} = ${JSON.stringify(ch.before)}`));
      else
        out(
          `${c.yellow('~')} ${ch.key}: ${JSON.stringify(ch.before)} → ${JSON.stringify(ch.after)}`,
        );
    }
  }
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function cmdAudit(
  assetId: string,
  flags: { limit?: number | undefined },
): Promise<void> {
  const limit = flags.limit ?? 50;
  const events = await api.get<AuditEvent[]>(`/assets/${assetId}/audit?limit=${limit}`);
  const rows = events.map((e) => ({
    when: e.occurred_at.slice(0, 19).replace('T', ' '),
    event: e.event_type,
    actor: e.actor,
  }));
  out(table(rows, ['when', 'event', 'actor']));
}
