'use client';

import type { Employee } from '../store';
import { requestAppApi } from '../api/client';
import { mapEmployeesResponse } from '../mappers/employee-mapper';
import { useApiCollection } from './useApiCollection';

interface UseEmployeesResult {
  employees: Employee[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useEmployees(
  enabled: boolean,
  initialData?: Employee[],
): UseEmployeesResult {
  const { data, isLoading, error, reload } = useApiCollection({
    enabled,
    initialData,
    request: () => requestAppApi('/api/employees'),
    mapResponse: (payload) => mapEmployeesResponse(payload),
  });

  return {
    employees: data,
    isLoading,
    error,
    reload,
  };
}
