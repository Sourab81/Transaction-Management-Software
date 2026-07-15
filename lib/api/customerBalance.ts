'use client';

import { DirectBackendError, directBackendPost } from './direct-backend';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export interface CustomerBalance {
  id: number | string;
  customerId: number | string;
  customerCode?: string;
  customerName?: string;
  colorId?: string | null;
  phoneNo: string;
  lastTransaction: string;
  date?: string;
  counterOrBank?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  todayBalance?: number;
  todayBalanceStatus?: string;
  remark?: string;
  addedByName?: string;
  currentBalanceStatus: number | string;
  color?: string | null;
  status: number | string;
}

export interface CustomerBalanceFilters {
  pageNo?: number;
  limit?: number;
  status?: number;
  customerId?: number | string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PayCustomerBalancePayload {
  customerId: number | string;
  amount?: number;
  paymentAmount?: number;
  paymentMode: 'cash' | 'account';
  accountId?: number | string | null;
  counterId?: number | string | null;
  paymentDate?: string;
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
    if (error instanceof DirectBackendError) {
      return normalizeMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export const getCustomerBalance = (filters: CustomerBalanceFilters = {}) =>
  directBackendPost('getCustomerBalance', {
    page_no: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(typeof filters.customerId !== 'undefined' ? { customer_id: filters.customerId } : {}),
  });

export const payCustomerBalance = (payload: PayCustomerBalancePayload) =>
  handleMutation(
    () => directBackendPost('payCustomerBalance', {
      customer_id: payload.customerId,
      payment_amount: payload.paymentAmount ?? payload.amount,
      payment_mode: payload.paymentMode,
      ...(payload.accountId ? { account_id: payload.accountId } : {}),
      ...(payload.counterId ? { counter_id: payload.counterId } : {}),
      ...(payload.paymentDate ? { payment_date: payload.paymentDate } : {}),
      ...(payload.remark ? { remark: payload.remark } : {}),
    }),
    'Customer balance payment completed.',
  );
