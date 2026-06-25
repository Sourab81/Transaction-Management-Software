import { requestAppApiMutation } from './client';
import type { CustomerBalanceFilters } from './customerBalance';

export const getCustomerOutstanding = async (filters: CustomerBalanceFilters = {}) => {
  const response = await requestAppApiMutation('/api/customer-outstanding', {
    action: 'list',
    pageNo: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(typeof filters.customerId !== 'undefined' ? { customerId: filters.customerId } : {}),
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Customers Outstanding][Service] Parsed app API response:', response);
  }
  return response;
};
