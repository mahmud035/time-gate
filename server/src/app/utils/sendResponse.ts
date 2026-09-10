import type { Response } from 'express';

export type ApiResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
};

/**
 * Single exit point for successful responses so every endpoint returns the
 * same envelope and the frontend types can mirror it exactly.
 */
export const sendResponse = <T>(
  res: Response,
  payload: { statusCode: number; message: string; data: T },
): void => {
  const body: ApiResponse<T> = {
    statusCode: payload.statusCode,
    success: true,
    message: payload.message,
    data: payload.data,
  };

  res.status(payload.statusCode).json(body);
};
