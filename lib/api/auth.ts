type UnknownRecord = Record<string, unknown>;

export interface LoginApiResponseBody extends UnknownRecord {
  status?: boolean | number | string;
  message?: unknown;
  data?: unknown;
}

export interface LoginApiResult {
  statusCode: number;
  body: LoginApiResponseBody | null;
}

export class LoginApiError extends Error {
  readonly statusCode: number | null;
  readonly fieldErrors: Record<string, string>;
  readonly body: LoginApiResponseBody | null;

  constructor(
    message: string,
    options?: {
      statusCode?: number | null;
      fieldErrors?: Record<string, string>;
      body?: LoginApiResponseBody | null;
    },
  ) {
    super(message);
    this.name = 'LoginApiError';
    this.statusCode = options?.statusCode ?? null;
    this.fieldErrors = options?.fieldErrors ?? {};
    this.body = options?.body ?? null;
  }
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJoinedMessage = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => readJoinedMessage(entry))
      .filter(Boolean)
      .join(' ');
  }

  if (isRecord(value)) {
    return Object.values(value)
      .map((entry) => readJoinedMessage(entry))
      .filter(Boolean)
      .join(' ');
  }

  return '';
};

const parseFieldErrors = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>((accumulator, [key, entry]) => {
    const message = readJoinedMessage(entry);
    if (message) {
      accumulator[key] = message;
    }

    return accumulator;
  }, {});
};

const parseResponseBody = (rawBody: string): LoginApiResponseBody | null => {
  if (!rawBody.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return isRecord(parsed) ? parsed as LoginApiResponseBody : null;
  } catch {
    return null;
  }
};

const hasExplicitFailureStatus = (value: unknown) => {
  if (value === false || value === 'false') {
    return true;
  }

  if (typeof value === 'number') {
    return value >= 400;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value) >= 400;
  }

  return false;
};

const getLoginEndpoint = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new LoginApiError('API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.');
  }

  return `${baseUrl.replace(/\/+$/, '')}/login`;
};

const buildLoginApiError = (statusCode: number, body: LoginApiResponseBody | null) => {
  const fieldErrors = parseFieldErrors(body?.message);
  const responseMessage = readJoinedMessage(body?.message) || readJoinedMessage(body?.error);

  if (Object.keys(fieldErrors).length > 0) {
    return new LoginApiError(responseMessage, {
      statusCode,
      fieldErrors,
      body,
    });
  }

  if (responseMessage) {
    return new LoginApiError(responseMessage, {
      statusCode,
      body,
    });
  }

  if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
    return new LoginApiError('Invalid username or password.', {
      statusCode,
      body,
    });
  }

  return new LoginApiError('Login failed. Please try again in a moment.', {
    statusCode,
    body,
  });
};

export const loginWithApi = async (
  username: string,
  password: string,
): Promise<LoginApiResult> => {
  const endpoint = getLoginEndpoint();
  const requestBody = new URLSearchParams({
    username,
    password,
  });

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: requestBody.toString(),
      cache: 'no-store',
    });
  } catch {
    throw new LoginApiError('Unable to reach the login service. Check the API server and try again.');
  }

  const rawBody = await response.text();
  const body = parseResponseBody(rawBody);

  if (!response.ok || hasExplicitFailureStatus(body?.status)) {
    throw buildLoginApiError(response.status, body);
  }

  return {
    statusCode: response.status,
    body,
  };
};

export const loginWithAppApi = async (
  username: string,
  password: string,
): Promise<LoginApiResult> => {
  let response: Response;

  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email: username,
        password,
      }),
      cache: 'no-store',
    });
  } catch {
    throw new LoginApiError('Unable to reach the login service. Check the API server and try again.');
  }

  const rawBody = await response.text();
  const body = parseResponseBody(rawBody);

  if (!response.ok || hasExplicitFailureStatus(body?.status)) {
    throw buildLoginApiError(response.status, body);
  }

  return {
    statusCode: response.status,
    body,
  };
};
