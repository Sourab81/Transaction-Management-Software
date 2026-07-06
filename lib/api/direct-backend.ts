'use client';

// ---------------------------------------------------------------------------
// Direct Backend API Helper
//
// Calls the PHP backend (CodeIgniter) directly from the browser, the same
// way LoginScreen already does.  Every protected endpoint validates the JWT
// via $this->authorization_token->validateToken() which reads the
// "Authorization: Bearer <token>" header.
//
// Token lifecycle:
//   storeAuthToken(token)  → called by completeApiLogin after direct login
//   getStoredAuthToken()   → called by directBackendFetch before every request
//   clearAuthToken()       → called by logoutUser on sign-out
// ---------------------------------------------------------------------------

const AUTH_TOKEN_STORAGE_KEY = 'enest-auth-token';

/** Persist the raw JWT that the backend returned on login. */
export const storeAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

/** Read the stored JWT.  Returns null when not signed in. */
export const getStoredAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

/** Remove the JWT on logout. */
export const clearAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class DirectBackendError extends Error {
  readonly statusCode: number | null;
  readonly body: unknown;

  constructor(message: string, statusCode: number | null, body: unknown) {
    super(message);
    this.name = 'DirectBackendError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const getBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new DirectBackendError(
      'API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.',
      501,
      null,
    );
  }
  return baseUrl.replace(/\/+$/, '');
};

const buildUrl = (endpoint: string): string => {
  const normalized = endpoint.trim().replace(/^\/+/, '');
  return `${getBaseUrl()}/${normalized}`;
};

const parseBody = async (response: Response): Promise<unknown> => {
  const rawBody = await response.text();
  if (!rawBody.trim()) return null;
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readMessage = (body: unknown, fallback: string): string => {
  if (typeof body === 'string' && body.trim()) {
    const trimmed = body.trim();
    const looksLikeHtml = /<(!doctype html|html|body|h1)/i.test(trimmed);
    return looksLikeHtml ? fallback : trimmed;
  }
  if (isRecord(body)) {
    const msg = body.message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    if (Array.isArray(msg)) {
      const joined = msg.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean).join(' ');
      if (joined) return joined;
    }
    if (isRecord(msg)) {
      const joined = Object.values(msg)
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
        .join(' ');
      if (joined) return joined;
    }
    const err = body.error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  return fallback;
};

const isBackendFailure = (body: unknown): boolean => {
  if (!isRecord(body)) return false;
  if (body.status === false || body.success === false) return true;
  const status =
    typeof body.status === 'number'
      ? body.status
      : typeof body.status === 'string'
        ? Number(body.status)
        : null;
  return typeof status === 'number' && Number.isFinite(status) && status >= 400;
};

// ---------------------------------------------------------------------------
// Request options
// ---------------------------------------------------------------------------

export interface DirectBackendOptions {
  /** HTTP method � defaults to 'POST' for mutations, 'GET' for reads. */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Body fields serialized as form-encoded (PHP expects this format). */
  body?: Record<string, unknown>;
  /** When true, sends body as JSON (Content-Type: application/json) instead of form-encoded. */
  jsonBody?: boolean;
  /** AbortSignal for cancellable requests. */
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Core fetch function
// ---------------------------------------------------------------------------

/**
 * Call a PHP backend endpoint directly from the browser.
 *
 * Attaches `Authorization: Bearer <token>` from localStorage.
 * Serializes body as application/x-www-form-urlencoded (PHP form format).
 *
 * Throws DirectBackendError on failure.
 */
export const directBackendFetch = async <T = unknown>(
  endpoint: string,
  options: DirectBackendOptions = {},
): Promise<T> => {
  const token = getStoredAuthToken();
  const method = options.method ?? 'POST';

  // Build request body - either JSON or form-encoded
  let bodyString: string | undefined;
  let contentType: string | undefined;
  if ((method === 'POST' || method === 'PUT') && options.body) {
    if (options.jsonBody) {
      bodyString = JSON.stringify(options.body);
      contentType = 'application/json;charset=UTF-8';
    } else {
      const form = new URLSearchParams();
      Object.entries(options.body).forEach(([key, value]) => {
        if (typeof value !== 'undefined' && value !== null) {
          if (typeof value === 'object') {
            form.set(key, JSON.stringify(value));
          } else {
            form.set(key, String(value));
          }
        }
      });
      bodyString = form.toString();
      contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
    }
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(endpoint), {
      method,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(contentType ? { 'Content-Type': contentType } : {}),
      },
      body: bodyString,
      cache: 'no-store',
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new DirectBackendError('Unable to reach the backend API.', null, null);
  }

  const body = await parseBody(response);

  if (!response.ok || isBackendFailure(body)) {
    const statusCode = !response.ok
      ? response.status
      : isRecord(body) && typeof body.status === 'number'
        ? body.status
        : response.status;

    throw new DirectBackendError(
      readMessage(body, `The backend request failed (${statusCode}).`),
      statusCode,
      body,
    );
  }

  return body as T;
};

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/** POST to a backend endpoint with a form-encoded body. */
export const directBackendPost = <T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> =>
  directBackendFetch<T>(endpoint, { method: 'POST', body, signal });

/** POST to a backend endpoint with a JSON body. */
export const directBackendPostJson = <T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> =>
  directBackendFetch<T>(endpoint, { method: 'POST', body, jsonBody: true, signal });

/** GET a backend endpoint (no body). */
export const directBackendGet = <T = unknown>(
  endpoint: string,
  signal?: AbortSignal,
): Promise<T> =>
  directBackendFetch<T>(endpoint, { method: 'GET', signal });
