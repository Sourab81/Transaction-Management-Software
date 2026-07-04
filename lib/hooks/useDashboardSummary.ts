'use client';

import type { DashboardSummary } from '../mappers/dashboard-summary-mapper';
import { directBackendGet } from '../api/direct-backend';
import { mapDashboardSummaryResponse } from '../mappers/dashboard-summary-mapper';
import { useApiResource } from './useApiResource';

interface UseDashboardSummaryResult {
  summary: DashboardSummary | null;
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useDashboardSummary(
  enabled: boolean,
  initialData?: DashboardSummary | null,
): UseDashboardSummaryResult {
  const endpoint = process.env.NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH?.trim();

  const { data, isLoading, error, reload } = useApiResource({
    enabled: enabled && !!endpoint,
    initialData,
    request: () => {
      if (!endpoint) {
        throw new Error('Backend endpoint is not configured for dashboard summary.');
      }
      return directBackendGet(endpoint);
    },
    mapResponse: mapDashboardSummaryResponse,
  });

  return {
    summary: data,
    isLoading,
    error: !endpoint && enabled ? 'Dashboard summary path not configured.' : error,
    reload,
  };
}
