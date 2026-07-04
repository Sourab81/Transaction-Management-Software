'use client';

import { directBackendPost } from './direct-backend';

export interface CustomerPayment {
  id: number | string;
  paymentDate: string;
  invoiceId: string;
  customerId: number | string;
  customerCode?: string;
  customerName?: string;
  colorId?: string | null;
  color?: string | null;
  counterId?: number | string;
  counterName?: string;
  onlineAmount: number;
  cashAmount: number;
  debitAmount?: number;
  creditAmount?: number;
  totalPaid: number;
  currentBalance?: number;
  accountName?: string;
  remark?: string;
  addedByName?: string;
  status: number | string;
}

export interface CustomerPaymentFilters {
  pageNo?: number;
  limit?: number;
  status?: number;
  customerId?: number | string;
  counterId?: number | string;
}

export const getCustomerPayments = (filters: CustomerPaymentFilters = {}) =>
  directBackendPost('getCustomerPayments', {
    page_no: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(typeof filters.customerId !== 'undefined' ? { customer_id: filters.customerId } : {}),
    ...(typeof filters.counterId !== 'undefined' ? { counter_id: filters.counterId } : {}),
  });
