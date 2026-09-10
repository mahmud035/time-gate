import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';

/** Unmatched API route. Kept in the envelope shape so clients parse it normally. */
export const notFound: RequestHandler = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    statusCode: StatusCodes.NOT_FOUND,
    success: false,
    message: `No route matches ${req.method} ${req.originalUrl}`,
    data: null,
  });
};
