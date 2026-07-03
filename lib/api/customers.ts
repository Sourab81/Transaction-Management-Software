import { AppApiError, requestAppApi, requestAppApiMutation } from './client';
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

  if (typeof filters.pageNo !== 'undefined') params.set('pageNo', String(filters.pageNo));
  if (typeof filters.page !== 'undefined') params.set('page', String(filters.page));
  if (typeof filters.limit !== 'undefined') params.set('limit', String(filters.limit));
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
    () => {
      const apiUrl = '/api/customers';
      const requestPayload = {
        action: 'update',
        ...payload,
      };
      console.log('API URL', apiUrl);
      console.log('Update Payload', requestPayload);
      return requestAppApiMutation(apiUrl, requestPayload)
        .then((data) => {
          console.log('Response Status:', 200);
          console.log('Response Data:', data);
          return data;
        })
        .catch((error) => {
          if (error instanceof AppApiError) {
            console.log('Response Status:', error.statusCode);
            console.log('Response Data:', error.body);
          }
          throw error;
        });
    },
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
