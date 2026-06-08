import { readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { api } from './client.js';
import { c, out } from './format.js';

type Spec = Record<string, unknown>;
interface CompiledBody {
  system: string;
  developer: string;
  user: string;
  tools: unknown[];
  output_schema: unknown;
}

const enc = encodeURIComponent;

/** Pull the stored builder spec → YAML (stdout, or --out file). */
export async function cmdBuilderPull(
  assetId: string,
  flags: { out?: string | undefined },
): Promise<void> {
  const spec = await api.get<Spec | null>(`/assets/${enc(assetId)}/builder-spec`);
  const yaml = stringify(spec ?? {});
  if (flags.out) {
    writeFileSync(flags.out, yaml, 'utf8');
    out(`${c.green('pulled')} ${assetId} spec → ${flags.out}`);
  } else {
    process.stdout.write(yaml);
  }
}

/** Push a YAML spec file → stored builder spec. */
export async function cmdBuilderPush(assetId: string, file: string): Promise<void> {
  const spec = parse(readFileSync(file, 'utf8')) as Spec;
  await api.put(`/assets/${enc(assetId)}/builder-spec`, { spec });
  out(`${c.green('pushed')} ${file} → ${assetId} builder spec`);
}

async function resolveSpec(assetId: string, file?: string): Promise<Spec> {
  if (file) return parse(readFileSync(file, 'utf8')) as Spec;
  const stored = await api.get<Spec | null>(`/assets/${enc(assetId)}/builder-spec`);
  if (!stored) throw new Error(`No builder spec for '${assetId}'. Push one first or pass a file.`);
  return stored;
}

/** Compile spec → prompt body and print it. */
export async function cmdBuilderCompile(assetId: string, file?: string): Promise<void> {
  const spec = await resolveSpec(assetId, file);
  const body = await api.post<CompiledBody>(`/assets/${enc(assetId)}/compile`, { spec });
  if (body.system) {
    out(c.bold('system'));
    out(body.system);
    out('');
  }
  if (body.developer) {
    out(c.bold('developer'));
    out(body.developer);
    out('');
  }
  out(c.bold('user'));
  out(body.user);
  if (body.tools.length > 0) out(`\n${c.dim('tools')} ${body.tools.length}`);
}

/** Generate baseline test cases from the stored spec. */
export async function cmdBuilderTests(assetId: string): Promise<void> {
  const rows = await api.post<Array<{ name: string }>>(
    `/assets/${enc(assetId)}/test-cases/generate`,
  );
  out(`${c.green('generated')} ${rows.length} test cases`);
  for (const r of rows) out(`  ${r.name}`);
}

/** Import an eval results .txt produced by an external evaluator. */
export async function cmdBuilderEval(assetId: string, file: string): Promise<void> {
  const raw = readFileSync(file, 'utf8');
  const row = await api.post<{ summary: { total: number; passed: number; failed: number } }>(
    `/assets/${enc(assetId)}/eval-import`,
    { raw, filename: file },
  );
  const s = row.summary;
  out(`${c.green('imported')} ${file} — ${s.passed}/${s.total} pass, ${s.failed} fail`);
}

/** Compile spec → create version → optionally promote. */
export async function cmdBuilderRelease(
  assetId: string,
  versionLabel: string,
  flags: { file?: string | undefined; promote: boolean },
): Promise<void> {
  const spec = await resolveSpec(assetId, flags.file);
  const body = await api.post<CompiledBody>(`/assets/${enc(assetId)}/compile`, { spec });
  const created = await api.post<{ id: string; version: string }>(
    `/assets/${enc(assetId)}/versions`,
    {
      version: versionLabel,
      body: {
        system: body.system,
        developer: body.developer,
        user: body.user,
        tools: body.tools,
        output_schema: body.output_schema,
      },
      variable_contract_snapshot: [],
      model_config_snapshot: {},
      output_contract_snapshot: (spec.output as unknown) ?? {},
      changelog: `Built via CLI: ${versionLabel}`,
    },
  );
  if (flags.promote) {
    await api.post(`/assets/${enc(assetId)}/versions/${created.id}/promote`);
  }
  const state = flags.promote ? ' → active' : ' (draft)';
  out(`${c.green('released')} ${c.bold(`${assetId}@${created.version}`)}${state}`);
}
