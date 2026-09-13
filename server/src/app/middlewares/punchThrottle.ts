import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError.js';

const WINDOW_MS = 10 * 60 * 1000;

const tooMany = (): never => {
  throw new AppError(
    StatusCodes.TOO_MANY_REQUESTS,
    'Too many incorrect codes. Please wait a moment and try again.',
  );
};

/**
 * Both limiters count **failures only**.
 *
 * This is what keeps the throttle invisible to the people who should never feel
 * it. Someone entering their own code succeeds, and a successful request costs
 * nothing; someone sweeping the code space fails on almost every attempt and
 * spends the entire budget. The same limit is generous to staff and tight to an
 * attacker without needing to tell them apart.
 */
const failuresOnly = { skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false };

/**
 * A backstop against an attempt spread across many addresses.
 *
 * Deliberately loose, and deliberately the only hard block at this layer. A
 * limiter that refuses everything from an address would close the door on a
 * whole workplace sharing one tablet, so per-address pressure is applied by the
 * tarpit instead, which slows wrong codes and never delays a right one. This
 * sits far above anything a real morning could produce.
 */
export const globalThrottle: RequestHandler = rateLimit({
  ...failuresOnly,
  windowMs: WINDOW_MS,
  limit: 300,
  keyGenerator: () => 'all',
  handler: tooMany,
});
