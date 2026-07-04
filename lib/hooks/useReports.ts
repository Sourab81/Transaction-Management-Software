'use client';

import type { ReportItem } from '../store';
import { directBackendGet } from '../api/direct-backend';
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
  const endpoint = process.env.NEXT_PUBLIC_API_REPORTS_PATH?.trim();

  const { data, isLoading, error, reload } = useApiCollection({
    enabled: enabled && !!endpoint,
    initialData,
    request: () => {
      if (!endpoint) {
        throw new Error('Backend endpoint is not configured for reports.');
      }
      return directBackendGet(endpoint);
    },
    mapResponse: mapReportsResponse,
  });

  return {
    reports: data,
    isLoading,
    error: !endpoint && enabled ? 'Reports path not configured.' : error,
    reload,
  };
}
