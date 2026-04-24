'use client';

import type { Counter } from '../store';
import { getDepartmentsResponse } from '../api/departments';
import { mapCountersResponse } from '../mappers/counter-mapper';
import { useApiCollection } from './useApiCollection';

interface UseDepartmentsResult {
  counters: Counter[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useDepartments(
  enabled: boolean,
  initialData?: Counter[],
  revalidateOnMount = false,
): UseDepartmentsResult {
  const { data, isLoading, error, reload } = useApiCollection({
    enabled,
    initialData,
    revalidateOnMount,
    request: getDepartmentsResponse,
    mapResponse: mapCountersResponse,
  });

  return {
    counters: data,
    isLoading,
    error,
    reload,
  };
}
