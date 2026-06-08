import type { MiddlewareHandler } from 'hono';
import { env } from '../lib/env.js';
import { errors } from '../lib/errors.js';

const BEARER_PREFIX = 'Bearer ';

/**
 * Single API token middleware for MVP. Constant-time compare to avoid
 * timing leaks. Token comes from PROMPTOPS_API_TOKEN env var.
 */
export const tokenAuth: MiddlewareHandler<{
  Variables: { actor: string };
}> = async (c, next) => {
  // Local single-user mode: no auth, actor = "local".
  if (env.PROMPTOPS_LOCAL) {
    c.set('actor', 'local');
    await next();
    return;
  }

  const header = c.req.header('authorization');
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    throw errors.unauthorized();
  }
  const presented = header.slice(BEARER_PREFIX.length).trim();
  if (!constantTimeEq(presented, env.PROMPTOPS_API_TOKEN ?? '')) {
    throw errors.unauthorized();
  }
  // Single-user MVP: actor is hardcoded. V1 introduces multi-user tokens.
  c.set('actor', 'mvp-operator');
  await next();
};

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
