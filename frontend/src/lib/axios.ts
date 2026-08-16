/**
 * VEL Finance — Axios HTTP Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Axios instance.
 *
 * This file configures infrastructure ONLY.
 * No actual API calls are made here.
 *
 * Architecture (per 10_DEVELOPMENT_RULES.md):
 * - All requests go through this single instance.
 * - Request interceptor: attaches auth token (placeholder for future auth).
 * - Response interceptor: normalizes errors into ApiError shape.
 * - Global error handler: handles 401, 403, network errors centrally.
 */
import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getEnvConfig } from '@/config/env';
import type { ApiError } from '@/types';

// ── Client Instance ───────────────────────────────────────────────────────────

const { apiBaseUrl } = getEnvConfig();

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor ───────────────────────────────────────────────────────

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    /**
     * Auth token attachment.
     * Phase: Future — authentication is not implemented in the foundation.
     * When auth is added, read the token from secure storage and attach here.
     *
     * Example (do NOT implement yet):
     * const token = tokenStorage.get();
     * if (token) config.headers.Authorization = `Bearer ${token}`;
     */
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Response Interceptor ──────────────────────────────────────────────────────

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const normalizedError = normalizeApiError(error);
    handleGlobalErrors(normalizedError);
    return Promise.reject(normalizedError);
  },
);

// ── Error Normalization ───────────────────────────────────────────────────────

/**
 * Transforms any Axios error into our typed ApiError shape.
 * Never exposes raw HTTP errors to UI components.
 */
function normalizeApiError(error: AxiosError): ApiError {
  if (error.response) {
    // Server responded with an error status
    const data = error.response.data as Record<string, unknown>;
    return {
      statusCode: error.response.status,
      message:
        (typeof data['message'] === 'string' ? data['message'] : null) ??
        getDefaultErrorMessage(error.response.status),
      code: typeof data['code'] === 'string' ? data['code'] : undefined,
      details:
        data['details'] instanceof Object
          ? (data['details'] as Record<string, string[]>)
          : undefined,
      // Pass through scheme_id for INACTIVE_SCHEME_REACTIVATABLE responses
      schemeId: typeof data['scheme_id'] === 'string' ? data['scheme_id'] : undefined,
    };
  }

  if (error.request) {
    // Request was made but no response received (network error)
    return {
      statusCode: 0,
      message: 'Unable to connect to the server. Please check your internet connection.',
      code: 'NETWORK_ERROR',
    };
  }

  // Request setup error
  return {
    statusCode: 0,
    message: 'An unexpected error occurred. Please try again.',
    code: 'CLIENT_ERROR',
  };
}

/**
 * Global error handler.
 * Handles errors that require application-level responses:
 * - 401: Session expired (future: redirect to login)
 * - 403: Insufficient permissions
 * - 5xx: Server errors
 */
function handleGlobalErrors(error: ApiError): void {
  switch (error.statusCode) {
    case 401:
      /**
       * Future: clear auth token and redirect to login.
       * tokenStorage.clear();
       * window.location.href = ROUTES.LOGIN;
       */
      console.warn('[VEL Finance] Session expired or unauthorized.');
      break;

    case 403:
      console.warn('[VEL Finance] Access denied:', error.message);
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      console.error('[VEL Finance] Server error:', error.message);
      break;

    default:
      break;
  }
}

/**
 * Returns a user-friendly default message for common HTTP status codes.
 * Per 10_DEVELOPMENT_RULES.md: never expose raw technical messages.
 */
function getDefaultErrorMessage(statusCode: number): string {
  const messages: Record<number, string> = {
    400: 'The request could not be processed. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with existing data.',
    422: 'The submitted data is invalid.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'An internal server error occurred. Please try again later.',
    502: 'The server is temporarily unavailable. Please try again.',
    503: 'The service is currently unavailable. Please try again later.',
  };

  return messages[statusCode] ?? 'An unexpected error occurred.';
}
