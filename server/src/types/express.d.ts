import type { AccessTokenPayload } from '../app/modules/auth/auth.interface.ts';

/**
 * Express 5 makes `req.query` a read-only getter, so `validateRequest` cannot
 * write parsed values back onto the request the Express 4 way. Validated output
 * is attached here instead, and controllers read it from a single known place.
 */
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
        cookies?: unknown;
      };

      /** Set by `requireAuth`. Absent on public routes. */
      auth?: AccessTokenPayload;
    }
  }
}

export {};
