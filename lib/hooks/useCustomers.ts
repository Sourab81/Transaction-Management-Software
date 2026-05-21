'use client';

import type { BusinessCustomer } from '../store';
import { getCustomers } from '../api/customers';
import { mapCustomersResponse } from '../mappers/customer-mapper';
import { useApiCollection } from './useApiCollection';

interface UseCustomersResult {
  customers: BusinessCustomer[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useCustomers(
  enabled: boolean,
  initialData?: BusinessCustomer[],
): UseCustomersResult {
  const { data, isLoading, error, reload } = useApiCollection({
    enabled,
    initialData,
    request: () => getCustomers(),
    mapResponse: mapCustomersResponse,
  });

  return {
    customers: data,
    isLoading,
    error,
    reload,
  };
}
