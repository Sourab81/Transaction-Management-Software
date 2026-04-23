'use client';

import type { Employee } from '../store';
import { getEmployeesResponse } from '../api/employee';
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
    request: getEmployeesResponse,
    mapResponse: (payload) => mapEmployeesResponse(payload),
  });

  return {
    employees: data,
    isLoading,
    error,
    reload,
  };
}
