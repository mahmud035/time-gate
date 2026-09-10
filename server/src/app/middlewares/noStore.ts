import type { RequestHandler } from 'express';

/**
 * Belt and braces alongside `x-vercel-enable-rewrite-caching: 0` in vercel.json.
 *
 * Vercel projects created on or after 6 April 2026 honour upstream cache headers
 * on external rewrites by default. A cached timesheet or punch response would be
 * a correctness bug, so this API declares itself uncacheable at the source too.
 */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
