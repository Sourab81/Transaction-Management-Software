'use client';

import type { Transaction } from '../store';
import { getTransactions, type TransactionFilters } from '../api/transactions';
import { mapTransactionsResponse } from '../mappers/transaction-mapper';
import { useApiCollection } from './useApiCollection';

interface UseTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useTransactions(
  enabled: boolean,
  initialData?: Transaction[],
  filters: TransactionFilters = {},
): UseTransactionsResult {
  const counterId = typeof filters.counterId === 'undefined' ? '' : String(filters.counterId);
  const { data, isLoading, error, reload } = useApiCollection({
    enabled,
    initialData,
    requestKey: counterId,
    request: () => getTransactions({
      pageNo: 1,
      limit: 10,
      status: 1,
      ...filters,
    }),
    mapResponse: mapTransactionsResponse,
  });

  return {
    transactions: data,
    isLoading,
    error,
    reload,
  };
}
