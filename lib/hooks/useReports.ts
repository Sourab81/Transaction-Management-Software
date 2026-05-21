'use client';

import type { ReportItem } from '../store';
import { requestAppApi } from '../api/client';
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
    request: () => requestAppApi('/api/reports'),
    mapResponse: mapReportsResponse,
  });

  return {
    reports: data,
    isLoading,
    error,
    reload,
  };
}
