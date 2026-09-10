import type { CookieOptions, Response } from 'express';
import { isProduction } from '../../config/index.js';

/**
 * Every cookie this API issues passes through here.
 *
 * Same-origin is what makes these first-party: the browser only ever talks to
 * the frontend origin, and `/api/*` is proxied to this server. Host-only (no
 * `Domain`), `SameSite=Strict`, `Path=/api`.
 *
 * If hosting ever changes (plan §9), this file is the only place that needs to.
 */
export const COOKIE = {
  access: 'tg_at',
  refresh: 'tg_rt',
  device: 'tg_dev',
  /** Temporary — Batch 1 proxy diagnostic only. Removed once the gate is green. */
  probe: 'tg_probe',
} as const;

export const MAX_AGE = {
  access: 15 * 60 * 1000, // 15 minutes
  refresh: 7 * 24 * 60 * 60 * 1000, // 7 days
  /** Browsers cap cookie lifetime at 400 days, so this is the practical maximum. */
  device: 400 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Shared attributes. `secure` is off in development only so the cookie works
 * over plain http on localhost; everywhere else it is mandatory.
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/api',
};

/** Cookie options for a given lifetime, in milliseconds. */
export const cookieOptions = (maxAgeMs: number): CookieOptions => ({
  ...baseOptions,
  maxAge: maxAgeMs,
});

/**
 * Clearing must repeat the exact attributes the cookie was set with, or the
 * browser keeps it. Nothing here may drift from `baseOptions`.
 */
export const clearAuthCookie = (res: Response, name: string): void => {
  res.clearCookie(name, baseOptions);
};
