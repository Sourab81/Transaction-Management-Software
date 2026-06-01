'use client';

import type { CustomerBalance } from '../api/customerBalance';
import { getCustomerOutstanding } from '../api/customerOutstanding';
import { mapCustomerBalanceResponse } from '../mappers/customer-balance-mapper';
import { useApiCollection } from './useApiCollection';

interface UseCustomerOutstandingResult {
  rows: CustomerBalance[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useCustomerOutstanding(enabled: boolean): UseCustomerOutstandingResult {
  const { data, isLoading, error, reload } = useApiCollection<CustomerBalance>({
    enabled,
    request: () => getCustomerOutstanding({
      pageNo: 1,
      limit: 10,
      status: 1,
    }),
    mapResponse: mapCustomerBalanceResponse,
  });

  return {
    rows: data,
    isLoading,
    error,
    reload,
  };
}
