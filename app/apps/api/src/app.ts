import { Hono } from 'hono';
import { tokenAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { health } from './routes/health.js';
import { assetsRouter } from './routes/assets.js';
import { openapiSpec } from './lib/openapi-spec.js';

export function buildApp() {
  const app = new Hono();

  // ── Global middleware ─────────────────────────────────────
  app.use('*', requestLogger);

  // ── Public routes ─────────────────────────────────────────
  app.get('/', (c) =>
    c.json({
      name: 'PromptOps API',
      version: '0.2.0',
      // PromptOps stores prompt versions. AI Eval scores model outputs.
      // evaluation: absent (use AI Eval tool)
      docs: 'GET /api/v0/docs',
      openapi: 'GET /api/v0/openapi.json',
      endpoints: {
        health: 'GET /health',
        assets: 'GET|POST /api/v0/assets',
        asset: 'GET|PATCH /api/v0/assets/:id',
        active: 'GET /api/v0/assets/:id/active',
        versions: 'GET|POST /api/v0/assets/:id/versions',
        version: 'GET /api/v0/assets/:id/versions/:vid',
        promote: 'POST /api/v0/assets/:id/versions/:vid/promote',
        archive: 'POST /api/v0/assets/:id/versions/:vid/archive',
        render: 'POST /api/v0/assets/:id/versions/:vid/render',
        rollback: 'POST /api/v0/assets/:id/rollback',
        audit: 'GET /api/v0/assets/:id/audit',
        stats: 'GET /api/v0/assets/:id/stats',
      },
    }),
  );

  app.route('/health', health);

  // ── OpenAPI spec + Scalar docs (public) ───────────────────
  app.get('/api/v0/openapi.json', (c) => c.json(openapiSpec));

  app.get('/api/v0/docs', (c) =>
    c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PromptOps API Docs</title>
  <meta name="description" content="PromptOps API — prompt asset registry" />
</head>
<body>
  <script id="api-reference" data-url="/api/v0/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`),
  );

  // ── Authenticated routes ──────────────────────────────────
  const api = new Hono();
  api.use('*', tokenAuth);
  api.route('/assets', assetsRouter);

  app.route('/api/v0', api);

  // ── Error handler ─────────────────────────────────────────
  app.onError(errorHandler);

  // ── 404 catch-all ─────────────────────────────────────────
  app.notFound((c) => c.json({ success: false, error: { code: 'not_found', message: 'Route not found', details: null } }, 404));

  return app;
}
