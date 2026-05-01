'use server';

import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE_NAME } from '../auth-cookie';
import {
  BackendApiConfigurationError,
  requestBackendCollection,
} from '../api/backend-client';
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

const readBackendErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    return readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallback;
  }

  return fallback;
};

export async function fetchBusinessDirectoryPage({
  page = 1,
  limit = 10,
}: FetchBusinessDirectoryPageInput): Promise<FetchBusinessDirectoryPageResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim();

  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      payload: null,
      error: 'No auth token cookie is available for the business directory request.',
    };
  }

  const searchParams = new URLSearchParams({
    page_no: String(page),
    limit: String(limit),
  });

  try {
    // The Admin Businesses screen intentionally uses a server action so clicking
    // Businesses asks the server to call BASE_URL/getUsers with the saved token.
    const response = await requestBackendCollection('businesses', token, searchParams);
    const fallbackMessage = 'Unable to load business users from the backend.';

    if (response.statusCode >= 400) {
      return {
        ok: false,
        statusCode: response.statusCode,
        payload: response.body,
        error: readBackendErrorMessage(response.body, fallbackMessage),
      };
    }

    return {
      ok: true,
      statusCode: response.statusCode,
      payload: response.body,
      error: '',
    };
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      return {
        ok: false,
        statusCode: error.statusCode,
        payload: null,
        error: error.message,
      };
    }

    return {
      ok: false,
      statusCode: 502,
      payload: null,
      error: 'Unable to reach the business user service right now.',
    };
  }
}

export async function checkUserIdentityAvailability({
  email,
  phone,
  excludedUserId,
}: CheckUserIdentityAvailabilityInput): Promise<CheckUserIdentityAvailabilityResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim();
  const emptyConflict = { email: false, phone: false };

  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      conflict: emptyConflict,
      error: 'No auth token cookie is available for the duplicate user check.',
    };
  }

  try {
    const searchParams = new URLSearchParams({
      page_no: '1',
      limit: '1000',
    });
    const response = await requestBackendCollection('businesses', token, searchParams);
    const fallbackMessage = 'Unable to check whether this user already exists.';

    if (response.statusCode >= 400) {
      return {
        ok: false,
        statusCode: response.statusCode,
        conflict: emptyConflict,
        error: readBackendErrorMessage(response.body, fallbackMessage),
      };
    }

    const conflict = findUserIdentityConflict(response.body, { email, phone, excludedUserId });

    return {
      ok: true,
      statusCode: response.statusCode,
      conflict,
      error: hasUserIdentityConflict(conflict) ? 'A user already exists with the same email or phone number.' : '',
    };
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      return {
        ok: false,
        statusCode: error.statusCode,
        conflict: emptyConflict,
        error: error.message,
      };
    }

    return {
      ok: false,
      statusCode: 502,
      conflict: emptyConflict,
      error: 'Unable to reach the user directory service right now.',
    };
  }
}
