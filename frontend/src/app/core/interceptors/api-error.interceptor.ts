import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/** A normalised API failure with a user-facing message. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId: string | null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function messageFor(error: HttpErrorResponse): string {
  const body = error.error as { error?: unknown } | null;

  if (body && typeof body.error === 'string' && body.error.trim()) {
    return body.error;
  }

  if (error.status === 0) {
    return 'Could not reach the server. Check your connection and try again.';
  }

  if (error.status >= 500) {
    return 'The server ran into a problem. Please try again later.';
  }

  return 'The request could not be completed.';
}

/**
 * Converts HttpErrorResponse into ApiError so components can show
 * `error.message` without knowing the backend's error envelope.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const body = error.error as { requestId?: unknown } | null;
      const requestId =
        (body && typeof body.requestId === 'string' ? body.requestId : null) ??
        error.headers?.get('X-Request-Id') ??
        null;

      return throwError(() => new ApiError(messageFor(error), error.status, requestId));
    })
  );

/** Extracts a displayable message from any error thrown by an API call. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.requestId ? `${error.message} (ref: ${error.requestId})` : error.message;
  }

  // Errors that did not pass through the interceptor (e.g. in tests).
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: unknown } | null;
    if (body && typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
  }

  return fallback;
}
