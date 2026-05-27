'use client';

import type { Employee } from '../store';
import { getEmployees } from '../api/employees';
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
    request: () => getEmployees(),
    mapResponse: (payload) => mapEmployeesResponse(payload),
  });

  return {
    employees: data,
    isLoading,
    error,
    reload,
  };
}
