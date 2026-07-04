'use client';

import type { Counter } from '../store';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';
import {
  mapDepartmentRecord,
  mapDepartmentToCounter,
  type DepartmentRecord,
} from '../mappers/department.mapper';
import { mapCountersResponse } from '../mappers/counter-mapper';
import { DirectBackendError, directBackendPost, directBackendGet } from './direct-backend';

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
  openingBalance: number;
  remark?: string;
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
    // Departments are called "Counters" in the backend.
    const payload = await directBackendGet('getCounters');

    return isNoDataFoundBody(payload) ? [] : payload;
  } catch (error) {
    if (error instanceof DirectBackendError && isNoDataFoundBody(error.body)) {
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
      create_date: payload.department.createdAt,
      opening_balance: payload.department.openingBalance,
      current_balance: payload.department.currentBalance,
      department_display: payload.department.departmentDisplay,
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
    const payload = await directBackendPost('createCounter', {
      name: input.name,
      opening_balance: input.openingBalance,
      remark: input.remark ?? '',
    });

    return normalizeCreateDepartmentPayload(payload, 'Department created successfully.');
  } catch (error) {
    if (error instanceof DirectBackendError) {
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

  // Since we now call the backend directly, we can use directBackendGet.
  // The token passed here is the same one stored in localStorage.
  try {
    const response = await directBackendGet('getCounters');
    if (isNoDataFoundBody(response)) return [];
    return mapCountersResponse(response);
  } catch (error) {
    if (error instanceof DirectBackendError) {
      if (isNoDataFoundBody(error.body)) return [];
      throw new DepartmentsApiError(
        readDepartmentsApiErrorMessage(
          error.body,
          error.statusCode === 401 || error.statusCode === 403
            ? 'Your session is not authorized to load departments.'
            : 'Unable to load departments right now.',
        ),
        error.statusCode,
        error.body,
      );
    }

    throw new DepartmentsApiError(
      'Unable to reach the departments service right now.',
      502,
      null,
    );
  }
};
