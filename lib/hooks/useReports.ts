'use client';

import type { ReportItem } from '../store';
import { getReportsResponse } from '../api/reports';
import { mapReportsResponse } from '../mappers/report-mapper';
import { useApiCollection } from './useApiCollection';

interface UseReportsResult {
  reports: ReportItem[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useReports(
  enabled: boolean,
  initialData?: ReportItem[],
): UseReportsResult {
  const { data, isLoading, error, reload } = useApiCollection({
    enabled,
    initialData,
    request: getReportsResponse,
    mapResponse: mapReportsResponse,
  });

  return {
    reports: data,
    isLoading,
    error,
    reload,
  };
}
