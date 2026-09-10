import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { COOKIE, MAX_AGE, cookieOptions } from '../../utils/cookies.js';
import { sendResponse } from '../../utils/sendResponse.js';

/**
 * Collects the headers that reveal what sits in front of this server, so a
 * failed probe says *why* rather than just "no cookie".
 */
const proxyDiagnostics = (req: Request) => {
  const forwarded: Record<string, string> = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (key.startsWith('x-vercel-') || key.startsWith('x-forwarded-')) {
      forwarded[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
  }

  return {
    protocolSeenByExpress: req.protocol,
    secure: req.secure,
    host: req.get('host') ?? null,
    origin: req.get('origin') ?? null,
    forwarded,
  };
};

/**
 * Sets a cookie carrying the exact attributes the real auth cookies will use
 * (HttpOnly, Secure, SameSite=Strict, host-only, Path=/api).
 *
 * Batch 1 diagnostic: Vercel does not document whether `Set-Cookie` survives an
 * external rewrite, and the whole auth design depends on it. Deleted once the
 * Batch 1 gate is green.
 */
const setProbeCookie = (req: Request, res: Response): void => {
  const issuedAt = new Date().toISOString();

  res.cookie(COOKIE.probe, issuedAt, cookieOptions(MAX_AGE.access));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: 'Probe cookie set. Now call the read endpoint.',
    data: {
      issuedAt,
      attributes: {
        httpOnly: true,
        secure: cookieOptions(MAX_AGE.access).secure,
        sameSite: 'strict',
        path: '/api',
        domain: 'host-only (not set)',
      },
      request: proxyDiagnostics(req),
    },
  });
};

/**
 * Reports whether the probe cookie came back. If `received` is true through the
 * Vercel proxy on a real iPhone, cookie auth is viable and the plan stands.
 */
const readProbeCookie = (req: Request, res: Response): void => {
  const value: unknown = req.cookies?.[COOKIE.probe];
  const received = typeof value === 'string' && value.length > 0;

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: received
      ? 'Probe cookie survived the round trip.'
      : 'Probe cookie did NOT come back.',
    data: {
      received,
      issuedAt: received ? value : null,
      cookieNamesReceived: Object.keys(
        (req.cookies ?? {}) as Record<string, unknown>,
      ),
      request: proxyDiagnostics(req),
    },
  });
};

export const probeController = {
  setProbeCookie,
  readProbeCookie,
};
