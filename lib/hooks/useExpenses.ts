'use client';

import { getExpenses, type ExpenseFilters, type ExpenseRecord } from '../api/expenses';
import { mapExpensesResponse } from '../mappers/expense-mapper';
import { useServerPagination } from './useServerPagination';
import type { BackendPagination } from '../api/pagination';

interface UseExpensesResult {
  expenses: ExpenseRecord[];
  isLoading: boolean;
  error: string;
  pagination: BackendPagination;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reload: () => void;
}

export function useExpenses(
  enabled: boolean,
  filters: ExpenseFilters = {},
): UseExpensesResult {
  const requestKey = JSON.stringify({ ...filters, pageNo: undefined, limit: undefined });
  const { rows, pagination, isLoading, error, reload, setPage, setLimit } = useServerPagination<ExpenseRecord>({
    enabled,
    storageKey: 'expenses_page_size',
    requestKey,
    request: (page, limit) => getExpenses({
      ...filters,
      pageNo: page,
      limit,
      status: 1,
    }),
    mapResponse: mapExpensesResponse,
  });

  return {
    expenses: rows,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit,
    reload,
  };
}
