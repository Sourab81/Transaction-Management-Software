'use client';

import { directBackendPostJson } from './direct-backend';

export interface ActivityLogFilters {
  dateFrom?: string;
  dateTo?: string;
  logType?: string;
  operation?: string;
  userId?: number;
  pageNo?: number;
  limit?: number;
}

export const getActivityLogs = (filters: ActivityLogFilters = {}) =>
  directBackendPostJson('getActivityLogs', {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    log_type: filters.logType,
    operation: filters.operation,
    user_id: filters.userId,
    page_no: filters.pageNo ?? 1,
    limit: filters.limit ?? 50,
  });

export const logout = () =>
  directBackendPostJson('logout', {});
