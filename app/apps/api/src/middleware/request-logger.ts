import type { MiddlewareHandler } from 'hono';
import { logger } from '../lib/logger.js';

/** Minimal structured request log. PII-free by design — no body/query logged. */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: duration,
    },
    'request',
  );
};
