/**
 * Mirrors the backend envelope exactly (`sendResponse` / `globalErrorHandler`).
 * If the API's shape changes, TypeScript breaks here at compile time.
 */
export type ApiResponse<T> = {
  statusCode: number;
  success: true;
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  statusCode: number;
  success: false;
  message: string;
  data: null;
  details?: { path: string; message: string }[];
};
