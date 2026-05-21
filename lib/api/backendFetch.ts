import 'server-only';

import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE_NAME } from '../auth-cookie';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

type BackendFetchMethod = 'GET' | 'POST';
type BackendFetchBodyFormat = 'json' | 'form';

interface BackendFetchOptions {
  method?: BackendFetchMethod;
  bodyFormat?: BackendFetchBodyFormat;
  body?: unknown;
}

export class BackendFetchError extends Error {
  readonly statusCode: number | null;
  readonly body: unknown;

  constructor(message: string, statusCode: number | null, body: unknown) {
    super(message);
    this.name = 'BackendFetchError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

const getBackendBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new BackendFetchError(
      'Backend API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL.',
      501,
      null,
    );
  }

  return baseUrl.replace(/\/+$/, '');
};

const buildBackendUrl = (endpoint: string) => {
  const normalizedEndpoint = endpoint.trim().replace(/^\/+/, '');
  return `${getBackendBaseUrl()}/${normalizedEndpoint}`;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const rawBody = await response.text();

  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
};

const readBackendMessage = (body: unknown, fallback: string) => {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallback;
  }

  return fallback;
};

const isBackendFailure = (body: unknown) => {
  if (!isRecord(body)) {
    return false;
  }

  if (body.status === false || body.success === false) {
    return true;
  }

  const status = typeof body.status === 'number'
    ? body.status
    : typeof body.status === 'string'
      ? Number(body.status)
      : null;

  return typeof status === 'number' && Number.isFinite(status) && status >= 400;
};

const buildRequestBody = (
  body: unknown,
  bodyFormat: BackendFetchBodyFormat,
) => {
  if (typeof body === 'undefined') {
    return undefined;
  }

  if (bodyFormat === 'form' && isRecord(body)) {
    const formBody = new URLSearchParams();

    Object.entries(body).forEach(([key, value]) => {
      if (typeof value !== 'undefined' && value !== null) {
        formBody.set(key, String(value));
      }
    });

    return formBody.toString();
  }

  return JSON.stringify(body);
};

const readBackendStatusCode = (response: Response, body: unknown) => {
  if (!response.ok) {
    return response.status;
  }

  if (!isRecord(body)) {
    return 502;
  }

  const status = typeof body.status === 'number'
    ? body.status
    : typeof body.status === 'string'
      ? Number(body.status)
      : null;

  return typeof status === 'number' && Number.isFinite(status) && status >= 400
    ? status
    : 502;
};

export async function backendFetch<T>(
  endpoint: string,
  options: BackendFetchOptions = {},
): Promise<T> {
  // The auth token is httpOnly, so frontend JavaScript cannot read it.
  // backendFetch runs server-side inside local /api routes and can read cookies().
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim();

  if (!token) {
    throw new BackendFetchError('No auth token cookie is available for the backend request.', 401, null);
  }

  const method = options.method ?? 'GET';
  const bodyFormat = options.bodyFormat ?? 'json';
  let response: Response;

  try {
    response = await fetch(buildBackendUrl(endpoint), {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: token,
        'Content-Type': bodyFormat === 'form'
          ? 'application/x-www-form-urlencoded;charset=UTF-8'
          : 'application/json',
      },
      body: method === 'POST' && typeof options.body !== 'undefined'
        ? buildRequestBody(options.body, bodyFormat)
        : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new BackendFetchError('Unable to reach the backend API.', null, null);
  }

  const body = await parseResponseBody(response);

  if (!response.ok || isBackendFailure(body)) {
    throw new BackendFetchError(
      readBackendMessage(body, 'The backend API request failed.'),
      readBackendStatusCode(response, body),
      body,
    );
  }

  return body as T;
}
