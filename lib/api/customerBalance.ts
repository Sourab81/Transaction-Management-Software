import { AppApiError, requestAppApiMutation } from './client';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export interface CustomerBalance {
  id: number | string;
  customerId: number | string;
  customerCode?: string;
  customerName?: string;
  phoneNo: string;
  lastTransaction: string;
  currentBalanceStatus: number | string;
  status: number | string;
}

export interface CustomerBalanceFilters {
  pageNo?: number;
  limit?: number;
  status?: number;
  customerId?: number | string;
}

export interface PayCustomerBalancePayload {
  customerId: number | string;
  amount?: number;
  paymentAmount?: number;
  paymentMode: 'cash' | 'account';
  accountId?: number | string | null;
  counterId?: number | string | null;
  remark?: string | null;
}

export interface CustomerBalanceMutationResult {
  success: boolean;
  message: string;
  data?: unknown;
}

const normalizeMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): CustomerBalanceMutationResult => {
  if (!isRecord(payload)) {
    return {
      success: false,
      message: fallbackMessage,
    };
  }

  return {
    success: payload.success === true || payload.status === true || payload.status === 1 || payload.status === '1',
    message: readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallbackMessage,
    data: payload.data,
  };
};

const handleMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof AppApiError) {
      return normalizeMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export const getCustomerBalance = (filters: CustomerBalanceFilters = {}) =>
  requestAppApiMutation('/api/customer-balance', {
    action: 'list',
    pageNo: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(typeof filters.customerId !== 'undefined' ? { customerId: filters.customerId } : {}),
  });

export const payCustomerBalance = (payload: PayCustomerBalancePayload) =>
  handleMutation(
    () => requestAppApiMutation('/api/customer-balance', {
      action: 'pay',
      ...payload,
      paymentAmount: payload.paymentAmount ?? payload.amount,
    }),
    'Customer balance payment completed.',
  );
