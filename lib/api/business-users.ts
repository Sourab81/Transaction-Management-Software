import {
  isRecord,
  readJoinedMessage,
} from '../mappers/legacy-record';
import {
  findUserIdentityConflict,
  hasUserIdentityConflict,
  type UserIdentityConflictResult,
} from '../mappers/user-identity-conflict';

interface FetchBusinessDirectoryPageInput {
  page?: number;
  limit?: number;
}

interface FetchBusinessDirectoryPageResult {
  ok: boolean;
  statusCode: number;
  payload: unknown;
  error: string;
}

interface CheckUserIdentityAvailabilityInput {
  email: string;
  phone: string;
  excludedUserId?: string;
}

interface CheckUserIdentityAvailabilityResult {
  ok: boolean;
  statusCode: number;
  conflict: UserIdentityConflictResult;
  error: string;
}

export interface CreateBusinessUserInput {
  username: string;
  password?: string;
  fullname: string;
  role?: string;
  email_id: string;
  contact_no: string;
  permission: string;
  privileges: string;
}

interface CreateBusinessUserResult {
  ok: boolean;
  statusCode: number;
  payload: unknown;
  error: string;
}

interface BusinessUsersApiRequestOptions {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

class BusinessUsersApiError extends Error {
  readonly statusCode: number | null;
  readonly body: unknown;

  constructor(message: string, statusCode: number | null, body: unknown) {
    super(message);
    this.name = 'BusinessUsersApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

const readBackendErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    return readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallback;
  }

  return fallback;
};

const buildQueryString = (query: BusinessUsersApiRequestOptions['query']) => {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

const parseLocalApiResponse = async (response: Response): Promise<unknown> => {
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

const requestBusinessUsersApi = async <T>({
  method = 'GET',
  query,
  body,
}: BusinessUsersApiRequestOptions = {}): Promise<T> => {
  // The backend auth token is httpOnly, so browser code must not call the
  // backend directly. This local route runs server-side and uses backendFetch.
  const response = await fetch('/api/business-users' + buildQueryString(query), {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: method === 'POST' && typeof body !== 'undefined'
      ? JSON.stringify(body)
      : undefined,
    cache: 'no-store',
  });
  const payload = await parseLocalApiResponse(response);

  if (!response.ok) {
    throw new BusinessUsersApiError(
      readBackendErrorMessage(payload, 'The business users request failed.'),
      response.status,
      payload,
    );
  }

  return payload as T;
};

export async function fetchBusinessDirectoryPage({
  page = 1,
  limit = 10,
}: FetchBusinessDirectoryPageInput): Promise<FetchBusinessDirectoryPageResult> {
  try {
    const payload = await requestBusinessUsersApi({
      query: { page, limit },
    });

    return {
      ok: true,
      statusCode: 200,
      payload,
      error: '',
    };
  } catch (error) {
    if (error instanceof BusinessUsersApiError) {
      return {
        ok: false,
        statusCode: error.statusCode ?? 502,
        payload: error.body,
        error: readBackendErrorMessage(error.body, error.message || 'Unable to load business users from the backend.'),
      };
    }

    return {
      ok: false,
      statusCode: 502,
      payload: null,
      error: error instanceof Error ? error.message : 'Unable to load business users from the backend.',
    };
  }
}

export async function checkUserIdentityAvailability({
  email,
  phone,
  excludedUserId,
}: CheckUserIdentityAvailabilityInput): Promise<CheckUserIdentityAvailabilityResult> {
  const emptyConflict = { email: false, phone: false };

  try {
    const payload = await requestBusinessUsersApi({
      query: { page: 1, limit: 1000 },
    });
    const conflict = findUserIdentityConflict(payload, { email, phone, excludedUserId });

    return {
      ok: true,
      statusCode: 200,
      conflict,
      error: hasUserIdentityConflict(conflict) ? 'A user already exists with the same email or phone number.' : '',
    };
  } catch (error) {
    if (error instanceof BusinessUsersApiError) {
      return {
        ok: false,
        statusCode: error.statusCode ?? 502,
        conflict: emptyConflict,
        error: readBackendErrorMessage(error.body, error.message || 'Unable to check whether this user already exists.'),
      };
    }

    return {
      ok: false,
      statusCode: 502,
      conflict: emptyConflict,
      error: error instanceof Error ? error.message : 'Unable to check whether this user already exists.',
    };
  }
}

export async function createBusinessUser(
  input: CreateBusinessUserInput,
): Promise<CreateBusinessUserResult> {
  try {
    const payload = await requestBusinessUsersApi({
      method: 'POST',
      body: { action: 'create', ...input },
    });

    return {
      ok: true,
      statusCode: 200,
      payload,
      error: '',
    };
  } catch (error) {
    if (error instanceof BusinessUsersApiError) {
      return {
        ok: false,
        statusCode: error.statusCode ?? 502,
        payload: error.body,
        error: readBackendErrorMessage(error.body, error.message || 'Unable to create business.'),
      };
    }

    return {
      ok: false,
      statusCode: 502,
      payload: null,
      error: error instanceof Error ? error.message : 'Unable to create business.',
    };
  }
}
