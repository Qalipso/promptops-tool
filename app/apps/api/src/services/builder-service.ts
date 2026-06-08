/**
 * Builder service — wizard spec persistence, prompt compilation, test-case
 * management, and eval-result ingestion. Pure logic lives in @promptops/builder;
 * this layer handles storage + audit.
 */
import {
  type BuilderSpec,
  type CompiledBody,
  compileSpec,
  generateTestCases,
  parseEval,
} from '@promptops/builder';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  type EvalImportRow,
  type TestCaseRow,
  assets,
  evalImports,
  testCases,
} from '../db/schema.js';
import { errors } from '../lib/errors.js';
import { getAsset } from './asset-repo.js';
import { writeAudit } from './audit.js';

// ── Spec ──────────────────────────────────────────────────────────────────────

export async function getBuilderSpec(asset_id: string): Promise<BuilderSpec | null> {
  const asset = await getAsset(asset_id); // 404 guard
  return (asset.builder_spec as BuilderSpec | null) ?? null;
}

export async function saveBuilderSpec(
  asset_id: string,
  spec: BuilderSpec,
  actor: string,
): Promise<BuilderSpec> {
  await getAsset(asset_id); // 404 guard
  await db
    .update(assets)
    .set({ builder_spec: spec, updated_at: new Date() })
    .where(eq(assets.id, asset_id));
  await writeAudit({
    actor,
    event_type: 'builder.spec_saved',
    asset_id,
    payload: { name: spec.brief?.name ?? '' },
  });
  return spec;
}

/** Compile a spec to a prompt body. Does not persist a version. */
export function compile(spec: BuilderSpec): CompiledBody {
  return compileSpec(spec);
}

// ── Test cases ──────────────────────────────────────────────────────────────

export async function listTestCases(asset_id: string): Promise<TestCaseRow[]> {
  await getAsset(asset_id);
  return db.select().from(testCases).where(eq(testCases.asset_id, asset_id));
}

export interface CreateTestCaseInput {
  name: string;
  input: Record<string, unknown>;
  note?: string | undefined;
  source?: string | undefined;
}

export async function createTestCase(
  asset_id: string,
  data: CreateTestCaseInput,
  actor: string,
): Promise<TestCaseRow> {
  await getAsset(asset_id);
  const [row] = await db
    .insert(testCases)
    .values({
      asset_id,
      name: data.name,
      input: data.input,
      note: data.note ?? null,
      source: data.source ?? 'manual',
    })
    .returning();
  await writeAudit({
    actor,
    event_type: 'test_case.created',
    asset_id,
    payload: { name: data.name, source: data.source ?? 'manual' },
  });
  return row!;
}

/** Generate baseline cases from the stored spec and persist them. */
export async function generateTestCasesForAsset(
  asset_id: string,
  actor: string,
): Promise<TestCaseRow[]> {
  const spec = await getBuilderSpec(asset_id);
  if (!spec) throw errors.badRequest(`Asset '${asset_id}' has no builder spec to generate from.`);

  const generated = generateTestCases(spec);
  const existing = await db.select().from(testCases).where(eq(testCases.asset_id, asset_id));
  const existingNames = new Set(existing.map((t) => t.name));

  const created: TestCaseRow[] = [];
  for (const g of generated) {
    if (existingNames.has(g.name)) continue;
    const [row] = await db
      .insert(testCases)
      .values({ asset_id, name: g.name, input: g.input, note: g.note, source: 'generated' })
      .returning();
    created.push(row!);
  }
  await writeAudit({
    actor,
    event_type: 'test_case.generated',
    asset_id,
    payload: { count: created.length },
  });
  return created;
}

export async function deleteTestCase(
  asset_id: string,
  test_case_id: string,
  actor: string,
): Promise<void> {
  await getAsset(asset_id);
  const [row] = await db.select().from(testCases).where(eq(testCases.id, test_case_id)).limit(1);
  if (!row || row.asset_id !== asset_id) throw errors.notFound(`Test case '${test_case_id}'`);
  await db.delete(testCases).where(eq(testCases.id, test_case_id));
  await writeAudit({
    actor,
    event_type: 'test_case.deleted',
    asset_id,
    payload: { name: row.name },
  });
}

// ── Eval import ─────────────────────────────────────────────────────────────

export async function importEval(
  asset_id: string,
  opts: { raw: string; filename?: string | undefined; version_id?: string | undefined },
  actor: string,
): Promise<EvalImportRow> {
  await getAsset(asset_id);
  const summary = parseEval(opts.raw);
  const [row] = await db
    .insert(evalImports)
    .values({
      asset_id,
      version_id: opts.version_id ?? null,
      filename: opts.filename ?? null,
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        pass_rate: summary.pass_rate,
      },
      parsed: summary.cases,
      raw: opts.raw,
      created_by: actor,
    })
    .returning();
  await writeAudit({
    actor,
    event_type: 'eval.imported',
    asset_id,
    ...(opts.version_id ? { version_id: opts.version_id } : {}),
    payload: { total: summary.total, passed: summary.passed, failed: summary.failed },
  });
  return row!;
}

export async function listEvalImports(asset_id: string): Promise<EvalImportRow[]> {
  await getAsset(asset_id);
  return db
    .select()
    .from(evalImports)
    .where(eq(evalImports.asset_id, asset_id))
    .orderBy(desc(evalImports.created_at));
}
