import { AppApiError, requestAppApi, requestAppApiMutation } from './client';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export interface Customer {
  id: number | string;
  customerName: string;
  mobileNo: string;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  status: number;
  addedDate?: string;
  updatedDate?: string;
}

export interface CustomerFilters {
  search?: string;
  status?: number;
}

export interface CreateCustomerPayload {
  customerName: string;
  mobileNo: string;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  id: number | string;
}

export interface CustomerMutationResult {
  success: boolean;
  message: string;
  customer?: unknown;
}

const appendCustomerFilters = (filters: CustomerFilters = {}) => {
  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (typeof filters.status !== 'undefined') params.set('status', String(filters.status));

  const query = params.toString();
  return query ? `/api/customers?${query}` : '/api/customers';
};

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

  return {
    success,
    message,
    ...(payload.customer ? { customer: payload.customer } : {}),
    ...(payload.item ? { customer: payload.item } : {}),
    ...(payload.data ? { customer: payload.data } : {}),
  };
};

const handleCustomerMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeCustomerMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof AppApiError) {
      return normalizeCustomerMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export const getCustomers = (filters?: CustomerFilters) =>
  requestAppApi(appendCustomerFilters(filters));

export const createCustomer = (payload: CreateCustomerPayload) =>
  handleCustomerMutation(
    () => requestAppApiMutation('/api/customers', {
      action: 'create',
      ...payload,
    }),
    'Customer created successfully.',
  );

export const updateCustomer = (payload: UpdateCustomerPayload) =>
  handleCustomerMutation(
    () => requestAppApiMutation('/api/customers', {
      action: 'update',
      ...payload,
    }),
    'Customer updated successfully.',
  );

export const deleteCustomer = (id: number | string) =>
  handleCustomerMutation(
    () => requestAppApiMutation('/api/customers', {
      action: 'delete',
      id,
    }),
    'Customer deleted successfully.',
  );
