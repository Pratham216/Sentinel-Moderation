import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.flatten() });
  }
  if (err instanceof Error && err.message === 'Unauthorized') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err instanceof Error && err.message === 'Forbidden') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  logger.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
