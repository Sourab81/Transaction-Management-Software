'use client';

import type { Transaction } from '../store';
import { getTransactionsResponse } from '../api/transactions';
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
): UseTransactionsResult {
  const { data, isLoading, error, reload } = useApiCollection({
    enabled,
    initialData,
    request: getTransactionsResponse,
    mapResponse: mapTransactionsResponse,
  });

  return {
    transactions: data,
    isLoading,
    error,
    reload,
  };
}
