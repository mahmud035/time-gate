import type { CookieOptions, Request, Response } from 'express';
import { isProduction } from '../../config/index.js';

/**
 * Every cookie this API issues passes through here.
 *
 * These are first-party by construction: this server serves both the client and
 * `/api/*` from one origin, so there is no proxy hop and no cross-site step to
 * survive. Host-only (no `Domain`), `SameSite=Strict`, `Path=/api`.
 *
 * Only managers hold cookies. Staff authenticate with a 4-digit code on every
 * punch and hold no session at all.
 *
 * If hosting ever changes, this file is the only place that needs to.
 */
export const COOKIE = {
  access: 'tg_at',
  refresh: 'tg_rt',
} as const;

export const MAX_AGE = {
  access: 15 * 60 * 1000, // 15 minutes
  refresh: 7 * 24 * 60 * 60 * 1000, // 7 days
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
