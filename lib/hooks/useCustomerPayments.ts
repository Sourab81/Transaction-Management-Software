'use client';

import { getCustomerPayments, type CustomerPayment } from '../api/customerPayments';
import { mapCustomerPaymentsResponse } from '../mappers/customer-payment-mapper';
import { useApiCollection } from './useApiCollection';

interface UseCustomerPaymentsResult {
  payments: CustomerPayment[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useCustomerPayments(enabled: boolean, counterId?: string): UseCustomerPaymentsResult {
  const { data, isLoading, error, reload } = useApiCollection<CustomerPayment>({
    enabled,
    requestKey: counterId || '',
    request: () => getCustomerPayments({
      pageNo: 1,
      limit: 10,
      status: 1,
      ...(counterId ? { counterId } : {}),
    }),
    mapResponse: mapCustomerPaymentsResponse,
  });

  return {
    payments: data,
    isLoading,
    error,
    reload,
  };
}
