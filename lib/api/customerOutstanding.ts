import { requestAppApiMutation } from './client';
import type { CustomerBalanceFilters } from './customerBalance';

export const getCustomerOutstanding = (filters: CustomerBalanceFilters = {}) =>
  requestAppApiMutation('/api/customer-outstanding', {
    action: 'list',
    pageNo: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(typeof filters.customerId !== 'undefined' ? { customerId: filters.customerId } : {}),
  });
