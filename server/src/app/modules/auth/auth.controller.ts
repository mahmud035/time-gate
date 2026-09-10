import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../utils/AppError.js';
import {
  clearAuthCookies,
  COOKIE,
  readCookie,
  setAuthCookies,
} from '../../utils/cookies.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { authService } from './auth.service.js';

/**
 * A short, human label for the manager's device list. Best-effort only — it is
 * shown to a person, never used for any authorisation decision.
 */
const deviceLabel = (req: Request): string => {
  const agent = req.get('user-agent') ?? '';

  if (/iPhone|iPad|iPod/i.test(agent)) return 'Manager — iOS';
  if (/Android/i.test(agent)) return 'Manager — Android';
  if (/Macintosh|Mac OS/i.test(agent)) return 'Manager — Mac';
  if (/Windows/i.test(agent)) return 'Manager — Windows';
  if (/Linux/i.test(agent)) return 'Manager — Linux';

  return 'Manager — unknown device';
};

/** Signs a manager in and issues the auth cookies. */
const login = async (req: Request, res: Response): Promise<void> => {
  const { body } = req.validated as {
    body: { email: string; password: string };
  };

  const { user, ...tokens } = await authService.login(
    body.email,
    body.password,
    deviceLabel(req),
  );

  setAuthCookies(res, tokens);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: `Welcome back, ${user.name}`,
    data: { user },
  });
};

/** Rotates the refresh token and re-issues both cookies. */
const refresh = async (req: Request, res: Response): Promise<void> => {
  const rawToken = readCookie(req, COOKIE.refresh);

  if (rawToken === undefined) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not signed in');
  }

  const { user, ...tokens } = await authService.refresh(
    rawToken,
    deviceLabel(req),
  );

  setAuthCookies(res, tokens);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Session refreshed',
    data: { user },
  });
};

/** Revokes the session and clears the cookies. Never fails. */
const logout = async (req: Request, res: Response): Promise<void> => {
  await authService.logout(readCookie(req, COOKIE.refresh));

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Signed out',
    data: null,
  });
};

/** Returns the signed-in user. 401 when there is no valid session. */
const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.auth) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not signed in');
  }

  const user = await authService.getCurrentUser(req.auth.sub);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Current user',
    data: { user },
  });
};

export const authController = {
  login,
  refresh,
  logout,
  getMe,
};
