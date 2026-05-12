import type { Counter } from '../store';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';
import {
  mapDepartmentRecord,
  mapDepartmentToCounter,
  type DepartmentRecord,
} from '../mappers/department.mapper';
import { mapCountersResponse } from '../mappers/counter-mapper';
import { AppApiError, requestAppApi, requestAppApiMutation } from './app-client';
import {
  BackendApiConfigurationError,
  requestBackendCollection,
} from './backend-client';

export class DepartmentsApiError extends Error {
  readonly statusCode: number | null;
  readonly body: unknown;

  constructor(message: string, statusCode: number | null, body: unknown) {
    super(message);
    this.name = 'DepartmentsApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface CreateDepartmentInput {
  name: string;
  remark?: string;
  accountIds: number[];
  defaultAccountId: number;
}

export interface CreateDepartmentResult {
  success: boolean;
  message: string;
  department?: DepartmentRecord;
  counter?: Counter;
}

const readDepartmentsApiErrorMessage = (
  body: unknown,
  fallbackMessage: string,
) => {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

const isNoDataFoundBody = (body: unknown) =>
  readDepartmentsApiErrorMessage(body, '').trim().toLowerCase() === 'no data found';

export const getDepartmentsResponse = async () => {
  try {
    const payload = await requestAppApi('/api/departments');

    return isNoDataFoundBody(payload) ? [] : payload;
  } catch (error) {
    if (error instanceof AppApiError && isNoDataFoundBody(error.body)) {
      return [];
    }

    throw error;
  }
};

const normalizeCreateDepartmentPayload = (
  payload: unknown,
  fallbackMessage: string,
): CreateDepartmentResult => {
  if (!isRecord(payload)) {
    return {
      success: false,
      message: fallbackMessage,
    };
  }

  const message = readDepartmentsApiErrorMessage(payload, fallbackMessage);
  const success = payload.success === true || payload.status === true;

  if (isRecord(payload.department)) {
    const department = mapDepartmentRecord({
      id: payload.department.departmentId,
      name: payload.department.departmentName,
      remark: payload.department.remark,
      status: payload.department.status,
      account_ids: payload.department.linkedAccountIds,
      default_account_id: payload.department.defaultAccountId,
      create_date: payload.department.createdAt,
      opening_balance: payload.department.openingBalance,
    });

    return {
      success,
      message,
      ...(department ? { department, counter: mapDepartmentToCounter(department) } : {}),
    };
  }

  if (isRecord(payload.data)) {
    const department = mapDepartmentRecord(payload.data);

    return {
      success,
      message,
      ...(department ? { department, counter: mapDepartmentToCounter(department) } : {}),
    };
  }

  return {
    success,
    message,
  };
};

export const createDepartmentResponse = async (
  input: CreateDepartmentInput,
): Promise<CreateDepartmentResult> => {
  try {
    const payload = await requestAppApiMutation('/api/departments', {
      action: 'create',
      name: input.name,
      remark: input.remark,
      accountIds: input.accountIds,
      defaultAccountId: input.defaultAccountId,
    });

    return normalizeCreateDepartmentPayload(payload, 'Department created successfully.');
  } catch (error) {
    if (error instanceof AppApiError) {
      return normalizeCreateDepartmentPayload(error.body, error.message || 'Unable to create department.');
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unable to create department.',
    };
  }
};

export const getDepartmentsWithToken = async (
  token: string,
): Promise<Counter[]> => {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new DepartmentsApiError(
      'Login succeeded, but no auth token was available for the departments request.',
      401,
      null,
    );
  }

  let response: Awaited<ReturnType<typeof requestBackendCollection>>;

  try {
    response = await requestBackendCollection('departments', normalizedToken);
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      throw new DepartmentsApiError(error.message, error.statusCode, null);
    }

    throw new DepartmentsApiError(
      'Unable to reach the departments service right now.',
      502,
      null,
    );
  }

  if (response.statusCode >= 400) {
    if (isNoDataFoundBody(response.body)) {
      return [];
    }

    throw new DepartmentsApiError(
      readDepartmentsApiErrorMessage(
        response.body,
        response.statusCode === 401 || response.statusCode === 403
          ? 'Your session is not authorized to load departments.'
          : 'Unable to load departments right now.',
      ),
      response.statusCode,
      response.body,
    );
  }

  if (isNoDataFoundBody(response.body)) {
    return [];
  }

  return mapCountersResponse(response.body);
};
