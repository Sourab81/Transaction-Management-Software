'use client';

import { DirectBackendError, directBackendPost } from './direct-backend';
import type { CustomerBalanceFilters } from './customerBalance';

export const getCustomerOutstanding = async (filters: CustomerBalanceFilters = {}) => {
  const body: Record<string, unknown> = {
    page_no: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(typeof filters.customerId !== 'undefined' ? { customer_id: filters.customerId } : {}),
  };
  if (filters.dateFrom) body.date_from = filters.dateFrom;
  if (filters.dateTo) body.date_to = filters.dateTo;

  try {
    const response = await directBackendPost('getCustomerOutstanding', body);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Customers Outstanding][Service] Parsed app API response:', response);
    }
    return response;
  } catch (error) {
    if (error instanceof DirectBackendError && (error.statusCode === 404 || error.statusCode === 501)) {
      return directBackendPost('getCustomerBalance', body);
    }
    throw error;
  }
};
