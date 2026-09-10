import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { UserRole } from '../modules/user/user.interface.js';
import { AppError } from '../utils/AppError.js';
import { COOKIE, readCookie } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Reads the access token from its HttpOnly cookie and attaches the payload.
 *
 * A missing or invalid token is a 401, never a redirect — this is an API, and
 * the client decides what to show.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readCookie(req, COOKIE.access);

  if (token === undefined) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not signed in');
  }

  // A malformed or expired token throws; the global handler maps both to 401.
  req.auth = verifyAccessToken(token);
  next();
};

/**
 * Restricts a route to specific roles. Always used after `requireAuth`, so an
 * absent payload here means the route is wired wrong, not that the user is
 * anonymous — hence 500 rather than 401.
 */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Route misconfigured: requireRole used without requireAuth',
      );
    }

    if (!roles.includes(req.auth.role)) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        'You do not have permission to do that',
      );
    }

    next();
  };
