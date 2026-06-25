'use client';

import type { Employee } from '../store';
import { getEmployees } from '../api/employees';
import { mapEmployeesResponse } from '../mappers/employee-mapper';
import { useServerPagination } from './useServerPagination';
import type { BackendPagination } from '../api/pagination';

interface UseEmployeesResult {
  employees: Employee[];
  isLoading: boolean;
  error: string;
  pagination: BackendPagination;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reload: () => void;
}

export function useEmployees(
  enabled: boolean,
  initialData?: Employee[],
): UseEmployeesResult {
  const { rows, pagination, isLoading, error, reload, setPage, setLimit } = useServerPagination<Employee>({
    enabled,
    storageKey: 'employees_page_size',
    request: (page, limit) => getEmployees({ pageNo: page, limit }),
    mapResponse: mapEmployeesResponse,
  });

  return {
    employees: rows.length > 0 || enabled ? rows : initialData ?? [],
    pagination,
    isLoading,
    error,
    setPage,
    setLimit,
    reload,
  };
}
