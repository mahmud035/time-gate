import axios from 'axios';
import type { ApiErrorResponse } from './types.ts';

/**
 * Relative baseURL, deliberately.
 *
 * In production Vercel rewrites `/api/*` to the Railway API; in development the
 * Vite proxy does the same. Either way the browser sees one origin, so cookies
 * are first-party and `withCredentials` is unnecessary — same-origin requests
 * carry cookies by default.
 *
 * Pointing this at the API's own hostname would silently make every auth cookie
 * third-party, which Safari blocks. Keep it relative.
 */
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Pulls the API's message out of an error so the UI never shows "Request failed". */
export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong',
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  return fallback;
};
