import { serve } from '@hono/node-server';
import { buildApp } from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';

const app = buildApp();

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info({ port: info.port }, 'PromptOps API started');
  },
);
