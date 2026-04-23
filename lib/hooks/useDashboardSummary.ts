'use client';

import type { DashboardSummary } from '../mappers/dashboard-summary-mapper';
import { getDashboardSummaryResponse } from '../api/dashboard';
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
  const { data, isLoading, error, reload } = useApiResource({
    enabled,
    initialData,
    request: getDashboardSummaryResponse,
    mapResponse: mapDashboardSummaryResponse,
  });

  return {
    summary: data,
    isLoading,
    error,
    reload,
  };
}
