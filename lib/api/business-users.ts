'use client';

import {
  isRecord,
  readJoinedMessage,
} from '../mappers/legacy-record';
import {
  findUserIdentityConflict,
  hasUserIdentityConflict,
  type UserIdentityConflictResult,
} from '../mappers/user-identity-conflict';
import { DirectBackendError, directBackendPost } from './direct-backend';

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
  try {
    const payload = await directBackendPost('getUsers', {
      page_no: String(page),
      limit: String(limit),
      role: '2', // Role 2 is backend Business user
    });

    return {
      ok: true,
      statusCode: 200,
      payload,
      error: '',
    };
  } catch (error) {
    if (error instanceof DirectBackendError) {
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
    const payload = await directBackendPost('getUsers', {
      page_no: '1',
      limit: '1000',
      role: '2',
    });
    const conflict = findUserIdentityConflict(payload, { email, phone, excludedUserId });

    return {
      ok: true,
      statusCode: 200,
      conflict,
      error: hasUserIdentityConflict(conflict) ? 'A user already exists with the same email or phone number.' : '',
    };
  } catch (error) {
    if (error instanceof DirectBackendError) {
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
    const payload = await directBackendPost('createUserByAdmin', {
      username: input.username,
      ...(input.password ? { password: input.password } : {}),
      fullname: input.fullname,
      role: input.role,
      email_id: input.email_id,
      contact_no: input.contact_no,
      permission: input.permission,
      privileges: input.privileges,
    });

    return {
      ok: true,
      statusCode: 200,
      payload,
      error: '',
    };
  } catch (error) {
    if (error instanceof DirectBackendError) {
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
