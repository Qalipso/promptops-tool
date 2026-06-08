import { zValidator } from '@hono/zod-validator';
import type { BuilderSpec } from '@promptops/builder';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { createAsset, getAsset, listAssets, updateAsset } from '../services/asset-repo.js';
import { getAssetStats, listAuditEvents } from '../services/audit.js';
import {
  compile,
  createTestCase,
  deleteTestCase,
  generateTestCasesForAsset,
  getBuilderSpec,
  importEval,
  listEvalImports,
  listTestCases,
  saveBuilderSpec,
} from '../services/builder-service.js';
import { renderVersion } from '../services/render-service.js';
import {
  archiveVersion,
  createVersion,
  getActiveVersion,
  getVersion,
  listVersions,
  promoteVersion,
  rollbackVersion,
} from '../services/version-repo.js';

type Vars = { Variables: { actor: string } };

const router = new Hono<Vars>();

// ─── Assets ───────────────────────────────────────────────────────────────────

const CreateAssetBody = z.object({
  id: z.string().min(1),
  owner: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lifecycle: z.enum(['unregistered', 'active', 'deprecated', 'sunset']).optional(),
  variable_contract: z.unknown().optional(),
  output_contract: z.unknown().optional(),
  model_config: z.unknown().optional(),
});

const UpdateAssetBody = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lifecycle: z.enum(['unregistered', 'active', 'deprecated', 'sunset']).optional(),
  variable_contract: z.unknown().optional(),
  output_contract: z.unknown().optional(),
  model_config: z.unknown().optional(),
});

router.get('/', async (c) => {
  const assets = await listAssets();
  // Enrich each asset with stats in parallel (best-effort)
  const enriched = await Promise.all(
    assets.map(async (a) => {
      const stats = await getAssetStats(a.id).catch(() => ({
        version_count: 0,
        last_rendered_at: null,
      }));
      return { ...a, stats };
    }),
  );
  return c.json({ success: true, data: enriched });
});

router.post('/', zValidator('json', CreateAssetBody), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('actor');
  const data = await createAsset(
    {
      id: body.id,
      owner: body.owner ?? actor,
      description: body.description ?? '',
      tags: body.tags ?? [],
      lifecycle: body.lifecycle ?? 'active',
      variable_contract: body.variable_contract ?? [],
      output_contract: body.output_contract ?? {},
      model_config: body.model_config ?? {},
      active_version_id: null,
    },
    actor,
  );
  return c.json({ success: true, data }, 201 as ContentfulStatusCode);
});

router.get('/:id', async (c) => {
  const data = await getAsset(c.req.param('id'));
  return c.json({ success: true, data });
});

router.patch('/:id', zValidator('json', UpdateAssetBody), async (c) => {
  const actor = c.get('actor');
  const data = await updateAsset(c.req.param('id'), c.req.valid('json'), actor);
  return c.json({ success: true, data });
});

// ─── Versions ─────────────────────────────────────────────────────────────────

const CreateVersionBody = z.object({
  version: z.string().min(1),
  parent_version_id: z.string().uuid().optional(),
  body: z
    .object({
      system: z.string().nullable().optional(),
      developer: z.string().nullable().optional(),
      user: z.string().min(1),
      tools: z.array(z.unknown()).optional(),
      output_schema: z.unknown().optional(),
    })
    .passthrough(),
  variable_contract_snapshot: z.unknown(),
  model_config_snapshot: z.unknown(),
  output_contract_snapshot: z.unknown(),
  changelog: z.string().optional(),
});

router.get('/:id/versions', async (c) => {
  await getAsset(c.req.param('id')); // 404 guard
  const data = await listVersions(c.req.param('id'));
  return c.json({ success: true, data });
});

router.post('/:id/versions', zValidator('json', CreateVersionBody), async (c) => {
  const actor = c.get('actor');
  const asset_id = c.req.param('id');
  await getAsset(asset_id); // 404 guard
  const body = c.req.valid('json');
  const data = await createVersion(
    {
      asset_id,
      version: body.version,
      parent_version_id: body.parent_version_id,
      body: body.body,
      variable_contract_snapshot: body.variable_contract_snapshot,
      model_config_snapshot: body.model_config_snapshot,
      output_contract_snapshot: body.output_contract_snapshot,
      changelog: body.changelog,
      author: actor,
    },
    actor,
  );
  return c.json({ success: true, data }, 201 as ContentfulStatusCode);
});

// GET /api/v0/assets/:id/active — returns the active version directly (agent-friendly)
router.get('/:id/active', async (c) => {
  await getAsset(c.req.param('id')); // 404 guard
  const version = await getActiveVersion(c.req.param('id'));
  if (!version) {
    return c.json({ success: false, error: 'No active version' }, 404 as ContentfulStatusCode);
  }
  return c.json({ success: true, data: version });
});

router.get('/:id/versions/:vid', async (c) => {
  await getAsset(c.req.param('id')); // 404 guard
  const data = await getVersion(c.req.param('vid'));
  return c.json({ success: true, data });
});

router.post('/:id/versions/:vid/promote', async (c) => {
  const actor = c.get('actor');
  await getAsset(c.req.param('id')); // 404 guard
  const data = await promoteVersion(c.req.param('vid'), actor);
  return c.json({ success: true, data });
});

router.post('/:id/versions/:vid/archive', async (c) => {
  const actor = c.get('actor');
  await getAsset(c.req.param('id')); // 404 guard
  const data = await archiveVersion(c.req.param('vid'), actor);
  return c.json({ success: true, data });
});

// POST /api/v0/assets/:id/versions/:vid/render — render version with manual inputs
// Template substitution only — no LLM call. PromptOps stores prompt versions, AI Eval scores outputs.
const RenderBody = z.object({
  inputs: z.record(z.unknown()).optional(),
  save: z.boolean().optional(),
});

router.post('/:id/versions/:vid/render', zValidator('json', RenderBody), async (c) => {
  const actor = c.get('actor');
  const asset_id = c.req.param('id');
  const version_id = c.req.param('vid');
  await getAsset(asset_id); // 404 guard
  const body = c.req.valid('json');

  const data = await renderVersion({
    version_id,
    inputs: body.inputs,
    actor,
    save: body.save ?? false,
  });

  return c.json({ success: true, data }, 202 as ContentfulStatusCode);
});

const RollbackBody = z.object({
  justification: z.string().min(1),
});

router.post('/:id/rollback', zValidator('json', RollbackBody), async (c) => {
  const actor = c.get('actor');
  const asset_id = c.req.param('id');
  await getAsset(asset_id); // 404 guard
  const { justification } = c.req.valid('json');
  const data = await rollbackVersion(asset_id, actor, justification);
  return c.json({ success: true, data });
});

router.get('/:id/audit', async (c) => {
  await getAsset(c.req.param('id')); // 404 guard
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const data = await listAuditEvents(c.req.param('id'), limit);
  return c.json({ success: true, data });
});

router.get('/:id/stats', async (c) => {
  await getAsset(c.req.param('id')); // 404 guard
  const data = await getAssetStats(c.req.param('id'));
  return c.json({ success: true, data });
});

// ─── Builder (wizard) ─────────────────────────────────────────────────────────

// Spec is free-form JSON validated structurally by @promptops/builder consumers.
const SpecBody = z.object({ spec: z.record(z.unknown()) });

router.get('/:id/builder-spec', async (c) => {
  const data = await getBuilderSpec(c.req.param('id'));
  return c.json({ success: true, data });
});

router.put('/:id/builder-spec', zValidator('json', SpecBody), async (c) => {
  const actor = c.get('actor');
  const { spec } = c.req.valid('json');
  const data = await saveBuilderSpec(c.req.param('id'), spec as unknown as BuilderSpec, actor);
  return c.json({ success: true, data });
});

router.post('/:id/compile', zValidator('json', SpecBody), async (c) => {
  const { spec } = c.req.valid('json');
  const data = compile(spec as unknown as BuilderSpec);
  return c.json({ success: true, data });
});

router.get('/:id/test-cases', async (c) => {
  const data = await listTestCases(c.req.param('id'));
  return c.json({ success: true, data });
});

const TestCaseBody = z.object({
  name: z.string().min(1),
  input: z.record(z.unknown()),
  note: z.string().optional(),
  source: z.string().optional(),
});

router.post('/:id/test-cases', zValidator('json', TestCaseBody), async (c) => {
  const actor = c.get('actor');
  const data = await createTestCase(c.req.param('id'), c.req.valid('json'), actor);
  return c.json({ success: true, data }, 201 as ContentfulStatusCode);
});

router.post('/:id/test-cases/generate', async (c) => {
  const actor = c.get('actor');
  const data = await generateTestCasesForAsset(c.req.param('id'), actor);
  return c.json({ success: true, data }, 201 as ContentfulStatusCode);
});

router.delete('/:id/test-cases/:tid', async (c) => {
  const actor = c.get('actor');
  await deleteTestCase(c.req.param('id'), c.req.param('tid'), actor);
  return c.json({ success: true, data: null });
});

const EvalImportBody = z.object({
  raw: z.string().min(1),
  filename: z.string().optional(),
  version_id: z.string().optional(),
});

router.post('/:id/eval-import', zValidator('json', EvalImportBody), async (c) => {
  const actor = c.get('actor');
  const data = await importEval(c.req.param('id'), c.req.valid('json'), actor);
  return c.json({ success: true, data }, 201 as ContentfulStatusCode);
});

router.get('/:id/eval-imports', async (c) => {
  const data = await listEvalImports(c.req.param('id'));
  return c.json({ success: true, data });
});

export { router as assetsRouter };
