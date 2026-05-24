import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: { code: err.code, message: err.message, details: err.details ?? null },
      },
      err.status,
    );
  }
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'validation_failed',
          message: 'Input validation failed',
          details: err.flatten(),
        },
      },
      422,
    );
  }
  logger.error({ err }, 'Unhandled error');
  return c.json(
    {
      success: false,
      error: { code: 'internal_error', message: 'Internal server error', details: null },
    },
    500,
  );
};
