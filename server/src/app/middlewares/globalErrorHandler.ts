import type { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProduction } from '../../config/index.js';
import { AppError } from '../utils/AppError.js';

type NormalisedError = {
  statusCode: number;
  message: string;
  details?: unknown;
};

/** Maps a thrown value onto an HTTP status and a message safe to show a user. */
const normalise = (error: unknown): NormalisedError => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'Validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'Validation failed',
      details: Object.values(error.errors).map((e) => ({
        path: e.path,
        message: e.message,
      })),
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: `Invalid value for ${error.path}`,
    };
  }

  // Duplicate key — a unique index rejected the write.
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  ) {
    return {
      statusCode: StatusCodes.CONFLICT,
      message: 'That value is already in use',
    };
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return { statusCode: StatusCodes.UNAUTHORIZED, message: 'Session expired' };
  }

  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return { statusCode: StatusCodes.UNAUTHORIZED, message: 'Invalid session' };
  }

  return {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    message: 'Something went wrong',
  };
};

/**
 * Terminal error handler. Express 5 forwards rejected promises here on its own,
 * so controllers need no async wrapper.
 */
export const globalErrorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { statusCode, message, details } = normalise(error);

  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    console.error(error);
  }

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    data: null,
    ...(details === undefined ? {} : { details }),
    ...(isProduction || !(error instanceof Error)
      ? {}
      : { stack: error.stack }),
  });
};
