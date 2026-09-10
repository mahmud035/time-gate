import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Validates the request against a Zod schema shaped
 * `{ body?, query?, params?, cookies? }`.
 *
 * Express 5 exposes `req.query` as a read-only getter, so parsed values are
 * attached to `req.validated` rather than written back onto the request.
 * Controllers read `req.validated`, never the raw request.
 */
export const validateRequest =
  (schema: ZodType) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const result = await schema.safeParseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });

    if (!result.success) {
      next(
        new AppError(
          StatusCodes.BAD_REQUEST,
          'Validation failed',
          result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        ),
      );
      return;
    }

    req.validated = result.data as Request['validated'];
    next();
  };
