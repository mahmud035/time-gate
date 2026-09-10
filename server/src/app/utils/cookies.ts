import type { CookieOptions, Request, Response } from 'express';
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

/**
 * Reads a cookie as a definite string, or undefined.
 *
 * `cookie-parser` types the jar as `any`, so every direct read would be an
 * unchecked access. Doing it once here means the rest of the codebase handles
 * `string | undefined` and an empty cookie is treated as absent, not as "".
 */
export const readCookie = (req: Request, name: string): string | undefined => {
  const jar = req.cookies as Record<string, unknown> | undefined;
  const value = jar?.[name];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/** Every cookie name the browser sent, for diagnostics only. */
export const cookieNames = (req: Request): string[] =>
  Object.keys((req.cookies ?? {}) as Record<string, unknown>);

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

/**
 * The single place auth cookies are issued.
 *
 * The refresh cookie's lifetime is pinned to the session row's own expiry rather
 * than recomputed, so the browser and the database can never disagree about when
 * a session ends.
 */
export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string; refreshExpiresAt: Date },
): void => {
  res.cookie(COOKIE.access, tokens.accessToken, cookieOptions(MAX_AGE.access));
  res.cookie(
    COOKIE.refresh,
    tokens.refreshToken,
    cookieOptions(Math.max(0, tokens.refreshExpiresAt.getTime() - Date.now())),
  );
};

/** Signing out clears both, whether or not the server knew the session. */
export const clearAuthCookies = (res: Response): void => {
  clearAuthCookie(res, COOKIE.access);
  clearAuthCookie(res, COOKIE.refresh);
};
