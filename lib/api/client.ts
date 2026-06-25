import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export class AppApiError extends Error {
  readonly statusCode: number | null;
  readonly body: unknown;

  constructor(message: string, statusCode: number | null, body: unknown) {
    super(message);
    this.name = 'AppApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

const parseResponseBody = async (response: Response) => {
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

export const readApiErrorMessage = (body: unknown, fallbackMessage: string) => {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

interface AppApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

export const requestAppApi = async <T = unknown>(
  path: string,
  options: AppApiRequestOptions = {},
): Promise<T> => {
  const method = options.method ?? 'GET';
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: method !== 'GET'
        ? {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }
        : undefined,
      body: method !== 'GET' && options.body
        ? JSON.stringify(options.body)
        : undefined,
      cache: 'no-store',
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new AppApiError('Unable to reach the local API route.', null, null);
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new AppApiError(
      readApiErrorMessage(body, 'The API request failed.'),
      response.status,
      body,
    );
  }

  return body as T;
};

export const requestAppApiMutation = async <T = unknown>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> => requestAppApi<T>(path, { method: 'POST', body });
