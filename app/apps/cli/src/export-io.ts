import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { ApiError, api } from './client.js';
import { c, out } from './format.js';
import type { Asset, Version } from './types.js';

/**
 * Portable YAML format for an asset + its versions.
 * Goal: commit prompts to a project's git repo alongside code.
 */
interface ExportDoc {
  asset: {
    id: string;
    owner: string;
    description: string;
    tags: string[];
    lifecycle: string;
    variable_contract: unknown;
    output_contract: unknown;
    model_config: unknown;
  };
  versions: Array<{
    version: string;
    state: string;
    changelog: string | null;
    body: { system?: string | null; user: string };
    variable_contract_snapshot: unknown;
    model_config_snapshot: unknown;
    output_contract_snapshot: unknown;
  }>;
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function cmdExport(
  assetId: string,
  flags: { out?: string | undefined },
): Promise<void> {
  const asset = await api.get<Asset>(`/assets/${assetId}`);
  const versions = await api.get<Version[]>(`/assets/${assetId}/versions`);

  // Order: everything by created_at asc, but the ACTIVE version last so a
  // create→promote replay reconstructs the correct active pointer.
  const sorted = [...versions].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const active = sorted.filter((v) => v.state === 'active');
  const rest = sorted.filter((v) => v.state !== 'active');
  const ordered = [...rest, ...active];

  const doc: ExportDoc = {
    asset: {
      id: asset.id,
      owner: asset.owner,
      description: asset.description,
      tags: asset.tags,
      lifecycle: asset.lifecycle,
      variable_contract: asset.variable_contract,
      output_contract: asset.output_contract,
      model_config: asset.model_config,
    },
    versions: ordered.map((v) => ({
      version: v.version,
      state: v.state,
      changelog: v.changelog,
      body: v.body,
      variable_contract_snapshot: v.variable_contract_snapshot,
      model_config_snapshot: v.model_config_snapshot,
      output_contract_snapshot: v.output_contract_snapshot,
    })),
  };

  const yaml = stringify(doc);
  if (flags.out) {
    writeFileSync(flags.out, yaml, 'utf8');
    out(`${c.green('exported')} ${assetId} → ${flags.out} (${doc.versions.length} versions)`);
  } else {
    process.stdout.write(yaml);
  }
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function cmdImport(file: string): Promise<void> {
  const raw = readFileSync(file, 'utf8');
  const doc = parse(raw) as ExportDoc;
  if (!doc?.asset?.id) throw new Error(`Invalid import file: missing asset.id (${file})`);

  // Create asset (idempotent: skip on conflict).
  try {
    await api.post<Asset>('/assets', {
      id: doc.asset.id,
      owner: doc.asset.owner,
      description: doc.asset.description,
      tags: doc.asset.tags,
      lifecycle: doc.asset.lifecycle,
      variable_contract: doc.asset.variable_contract,
      output_contract: doc.asset.output_contract,
      model_config: doc.asset.model_config,
    });
    out(`${c.green('created')} asset ${c.bold(doc.asset.id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      out(`${c.dim('exists')} asset ${doc.asset.id} — appending versions`);
    } else {
      throw e;
    }
  }

  // Existing versions → skip duplicates.
  const existing = await api.get<Version[]>(`/assets/${doc.asset.id}/versions`);
  const existingLabels = new Set(existing.map((v) => v.version));

  let created = 0;
  let promoted = 0;
  for (const v of doc.versions) {
    if (existingLabels.has(v.version)) {
      out(`${c.dim('skip')} ${v.version} (already present)`);
      continue;
    }
    const made = await api.post<Version>(`/assets/${doc.asset.id}/versions`, {
      version: v.version,
      body: v.body,
      variable_contract_snapshot: v.variable_contract_snapshot ?? [],
      model_config_snapshot: v.model_config_snapshot ?? {},
      output_contract_snapshot: v.output_contract_snapshot ?? {},
      changelog: v.changelog ?? undefined,
    });
    created++;
    // Replay state: promote anything that was not a draft so the active
    // pointer and previous-chain reconstruct in order.
    if (v.state !== 'draft') {
      await api.post<Version>(`/assets/${doc.asset.id}/versions/${made.id}/promote`);
      promoted++;
      if (v.state === 'archived') {
        await api.post<Version>(`/assets/${doc.asset.id}/versions/${made.id}/archive`);
      }
    }
  }

  out(`${c.green('imported')} ${c.bold(doc.asset.id)} — ${created} created, ${promoted} promoted`);
}
