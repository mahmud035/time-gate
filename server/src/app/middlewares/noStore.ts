import type { RequestHandler } from 'express';

/**
 * A cached punch or timesheet response would be a correctness bug — someone's
 * hours read back stale — so the API declares itself uncacheable at the source
 * rather than relying on any layer above it to get this right.
 *
 * Scoped to `/api` so the hashed client assets keep their own caching.
 */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
