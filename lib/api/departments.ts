import type { Counter } from '../store';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';
import { mapCountersResponse } from '../mappers/counter-mapper';
import { AppApiError, requestAppApi } from './app-client';
import {
  BackendApiConfigurationError,
  requestBackendCollection,
} from './backend-client';

export const demoDepartmentCounters: Counter[] = [
  {
    id: 'demo-department-1',
    name: 'Demo Department',
    code: 'DEMO-001',
    openingBalance: 0,
    currentBalance: 0,
    status: 'Active',
  },
];

const createDemoDepartmentCounters = () =>
  demoDepartmentCounters.map((counter) => ({ ...counter }));

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

    return isNoDataFoundBody(payload) ? createDemoDepartmentCounters() : payload;
  } catch (error) {
    if (error instanceof AppApiError && isNoDataFoundBody(error.body)) {
      return createDemoDepartmentCounters();
    }

    throw error;
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
      return createDemoDepartmentCounters();
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
    return createDemoDepartmentCounters();
  }

  return mapCountersResponse(response.body);
};
