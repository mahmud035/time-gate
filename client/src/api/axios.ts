import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse } from './types.ts';

/**
 * Relative baseURL, deliberately.
 *
 * In production one Express server serves this client and `/api/*`; in
 * development the Vite proxy mirrors that. Either way the browser sees one
 * origin, so cookies are first-party and `withCredentials` is unnecessary —
 * same-origin requests carry cookies by default.
 *
 * Pointing this at the API's own hostname would silently make every auth cookie
 * third-party, which Safari blocks. Keep it relative.
 */
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Endpoints that must never trigger a refresh attempt, or 401s would loop. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/logout', '/auth/refresh'];

/** In-flight refresh, shared so a burst of 401s produces one rotation, not many. */
let refreshInFlight: Promise<unknown> | null = null;

/**
 * The access token lives 15 minutes; the refresh cookie lives 7 days. On the
 * first 401 for a request we try one silent rotation and replay the original.
 *
 * This is what makes a reload after lunch land on the dashboard instead of the
 * login screen. A second failure falls through so the UI can react honestly.
 */
api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) {
    throw error;
  }

  const original = error.config as
    | (InternalAxiosRequestConfig & { _retried?: boolean })
    | undefined;

  if (
    !original ||
    original._retried === true ||
    NO_REFRESH_PATHS.some((path) => original.url?.includes(path) === true)
  ) {
    throw error;
  }

  original._retried = true;

  refreshInFlight ??= api.post('/auth/refresh').finally(() => {
    refreshInFlight = null;
  });

  await refreshInFlight;

  return api(original);
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
