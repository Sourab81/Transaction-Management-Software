'use client';

import type { CustomerPermissions } from '../platform-structure';
import { DirectBackendError, directBackendPost } from './direct-backend';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';
import { buildEmployeePermissionsPayload } from '../mappers/employee-permission-payload';

export interface EmployeeRecord {
  id: number | string;
  fullName: string;
  nickName: string;
  displayName: string;
  mobile: string;
  email: string;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  remark?: string | null;
  permissions: CustomerPermissions;
  status: number | string;
  createDate?: string;
  updateDate?: string;
  addedDate?: string;
}

export interface EmployeeFilters {
  pageNo?: number;
  limit?: number;
  status?: number;
  search?: string;
}

export interface EmployeeMutationPayload {
  id?: number | string;
  fullName: string;
  nickName: string;
  mobile: string;
  email: string;
  password?: string;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  remark?: string | null;
  permissions: CustomerPermissions;
  status?: 'Active' | 'Inactive' | number;
}

export interface EmployeeMutationResult {
  success: boolean;
  message: string;
  employee?: unknown;
}

const readEmployeeApiMessage = (payload: unknown, fallbackMessage: string) => {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (isRecord(payload)) {
    return readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallbackMessage;
  }
  return fallbackMessage;
};

const normalizeEmployeeMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): EmployeeMutationResult => {
  if (!isRecord(payload)) {
    return { success: false, message: fallbackMessage };
  }

  const success = payload.success === true || payload.status === true || payload.status === 1 || payload.status === '1';
  const message = readEmployeeApiMessage(payload, fallbackMessage);

  return {
    success,
    message,
    ...(payload.employee ? { employee: payload.employee } : {}),
    ...(payload.item ? { employee: payload.item } : {}),
    ...(payload.data ? { employee: payload.data } : {}),
  };
};

const handleEmployeeMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeEmployeeMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof DirectBackendError) {
      return normalizeEmployeeMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

const addOptionalEmployeeField = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (trimmedValue) target[key] = trimmedValue;
    return;
  }

  if (value !== null && typeof value !== 'undefined') {
    target[key] = value;
  }
};

const normalizeEmployeeStatus = (status: EmployeeMutationPayload['status']) => {
  if (status === 'Inactive') return 0;
  if (status === 'Active') return 1;
  return status;
};

const buildEmployeePayload = (
  payload: EmployeeMutationPayload,
  options: { includeActiveStatus?: boolean } = {},
) => {
  const permissions = buildEmployeePermissionsPayload(payload.permissions);
  const employeePayload: Record<string, unknown> = {
    fullname: payload.fullName,
    nickname: payload.nickName,
    contact_no: payload.mobile,
    email_id: payload.email,
    permissions: JSON.stringify(permissions),
  };

  addOptionalEmployeeField(employeePayload, 'password', payload.password);
  addOptionalEmployeeField(
    employeePayload,
    'gender',
    typeof payload.gender === 'string' ? payload.gender.toLowerCase() : payload.gender,
  );
  addOptionalEmployeeField(employeePayload, 'dob', payload.dob);
  addOptionalEmployeeField(employeePayload, 'address', payload.address);
  addOptionalEmployeeField(employeePayload, 'remark', payload.remark);

  const status = normalizeEmployeeStatus(payload.status);
  if (status === 0 || (options.includeActiveStatus && typeof status !== 'undefined')) {
    employeePayload.status = status;
  }

  return employeePayload;
};

export const getEmployees = (filters: EmployeeFilters = {}) =>
  directBackendPost('getEmployees', {
    page_no: filters.pageNo ?? 1,
    limit: filters.limit ?? 100,
    status: filters.status ?? 1,
    ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
  });

export const createEmployee = async (formPayload: EmployeeMutationPayload) => {
  const employeePayload = buildEmployeePayload(formPayload);

  console.log('Submitting employee');
  console.log(employeePayload);

  const result = await handleEmployeeMutation(
    () => directBackendPost('createEmployee', employeePayload),
    'Employee created successfully.',
  );

  console.log('Employee create response', result);
  return result;
};

export const updateEmployee = (payload: EmployeeMutationPayload & { id: number | string }) =>
  handleEmployeeMutation(
    () => directBackendPost('updateEmployee', {
      id: payload.id,
      employee_id: payload.id,
      ...buildEmployeePayload(payload, { includeActiveStatus: true }),
    }),
    'Employee updated successfully.',
  );

export const deleteEmployee = (id: number | string) =>
  handleEmployeeMutation(
    () => directBackendPost('deleteEmployee', { id, employee_id: id }),
    'Employee deleted successfully.',
  );
