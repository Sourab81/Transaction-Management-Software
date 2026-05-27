'use client';

import { getCustomerBalance } from '../api/customerBalance';
import type { CustomerBalance } from '../api/customerBalance';
import { mapCustomerBalanceResponse } from '../mappers/customer-balance-mapper';
import { useApiCollection } from './useApiCollection';

interface UseCustomerBalanceResult {
  balances: CustomerBalance[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useCustomerBalance(enabled: boolean): UseCustomerBalanceResult {
  const { data, isLoading, error, reload } = useApiCollection<CustomerBalance>({
    enabled,
    request: () => getCustomerBalance({
      pageNo: 1,
      limit: 10,
      status: 1,
    }),
    mapResponse: mapCustomerBalanceResponse,
  });

  return {
    balances: data,
    isLoading,
    error,
    reload,
  };
}
