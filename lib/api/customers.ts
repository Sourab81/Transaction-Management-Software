'use client';

import { DirectBackendError, directBackendPost, directBackendGet } from './direct-backend';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export interface Customer {
  id: number | string;
  customerCode?: string;
  customerName: string;
  mobileNo: string;
  dob?: string | null;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  color?: string | null;
  status: number;
  addedDate?: string;
  updatedDate?: string;
}

export interface CustomerFilters {
  pageNo?: number;
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  categoryId?: string;
}

export interface CreateCustomerPayload {
  customerName: string;
  mobileNo: string;
  dob?: string | null;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  colorId?: string | null;
  color?: string | null;
  categoryIds?: string[];
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  id: number | string;
}

export interface CustomerMutationResult {
  success: boolean;
  message: string;
  customer?: unknown;
}

const normalizeCustomerMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): CustomerMutationResult => {
  if (!isRecord(payload)) {
    return {
      success: false,
      message: fallbackMessage,
    };
  }

  const message = readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallbackMessage;
  const success = payload.success === true || payload.status === true || payload.status === 1 || payload.status === '1';
  const customer = payload.customer
    ?? payload.item
    ?? payload.data
    ?? (payload.customer_id || payload.customerId || payload.id ? payload : undefined);

  return {
    success,
    message,
    ...(customer ? { customer } : {}),
  };
};

const handleCustomerMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeCustomerMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof DirectBackendError) {
      return normalizeCustomerMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export const getCustomers = (filters: CustomerFilters = {}) =>
  directBackendPost('getCustomers', {
    page_no: filters.pageNo ?? filters.page ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
  });

export const createCustomer = (payload: CreateCustomerPayload) =>
  handleCustomerMutation(
    () => directBackendPost('createCustomer', {
      customer_name: payload.customerName,
      mobile_no: payload.mobileNo,
      ...(payload.dob ? { dob: payload.dob } : {}),
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.address ? { address: payload.address } : {}),
      ...(payload.remark ? { remark: payload.remark } : {}),
      ...(payload.colorId ? { customer_color_id: payload.colorId } : {}),
      ...(payload.color ? { customer_color: payload.color } : {}),
      ...(payload.categoryIds !== undefined ? { category_ids: payload.categoryIds } : {}),
    }),
    'Customer created successfully.',
  );

export const updateCustomer = (payload: UpdateCustomerPayload) =>
  handleCustomerMutation(
    () => directBackendPost('updateCustomer', {
      id: payload.id,
      customer_id: payload.id,
      ...(payload.customerName ? { customer_name: payload.customerName } : {}),
      ...(payload.mobileNo ? { mobile_no: payload.mobileNo } : {}),
      ...(payload.dob !== undefined ? { dob: payload.dob } : {}),
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.address !== undefined ? { address: payload.address } : {}),
      ...(payload.remark !== undefined ? { remark: payload.remark } : {}),
      ...(payload.colorId !== undefined ? { customer_color_id: payload.colorId } : {}),
      ...(payload.color !== undefined ? { customer_color: payload.color } : {}),
      ...(payload.categoryIds !== undefined ? { category_ids: payload.categoryIds } : {}),
    }),
    'Customer updated successfully.',
  );

export const deleteCustomer = (id: number | string) =>
  handleCustomerMutation(
    () => directBackendPost('deleteCustomer', { id, customer_id: id }),
    'Customer deleted successfully.',
  );
