import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly details: unknown;

  constructor(opts: {
    status: ContentfulStatusCode;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export const errors = {
  unauthorized: (msg = 'Missing or invalid API token') =>
    new AppError({ status: 401, code: 'unauthorized', message: msg }),
  forbidden: (msg = 'Forbidden') =>
    new AppError({ status: 403, code: 'forbidden', message: msg }),
  notFound: (resource: string) =>
    new AppError({ status: 404, code: 'not_found', message: `${resource} not found` }),
  badRequest: (msg: string, details?: unknown) =>
    new AppError({ status: 400, code: 'bad_request', message: msg, details }),
  conflict: (msg: string, details?: unknown) =>
    new AppError({ status: 409, code: 'conflict', message: msg, details }),
  validation: (details: unknown) =>
    new AppError({
      status: 422,
      code: 'validation_failed',
      message: 'Input validation failed',
      details,
    }),
  internal: (msg = 'Internal server error') =>
    new AppError({ status: 500, code: 'internal_error', message: msg }),
};
