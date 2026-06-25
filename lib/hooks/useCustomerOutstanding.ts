'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import type { CustomerBalance } from '../api/customerBalance';
import { getCustomerOutstanding } from '../api/customerOutstanding';
import { mapCustomerBalanceResponse } from '../mappers/customer-balance-mapper';
import { AppApiError } from '../api/client';
import { isRecord, readNumberValue, readRecordValue } from '../mappers/legacy-record';

interface CustomerOutstandingPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

interface UseCustomerOutstandingResult {
  rows: CustomerBalance[];
  isLoading: boolean;
  error: string;
  pagination: CustomerOutstandingPagination | null;
  reload: () => void;
}

const readPagination = (payload: unknown): CustomerOutstandingPagination | null => {
  if (!isRecord(payload)) return null;

  const pagination = readRecordValue(payload, ['pagination']);
  const source = pagination ?? payload;
  const currentPage = readNumberValue(source, ['page_no', 'pageNo', 'currentPage', 'current_page']) ?? 1;
  const limit = readNumberValue(source, ['limit', 'per_page', 'perPage']) ?? 10;
  const totalRecords = readNumberValue(source, ['total_records', 'totalRecords', 'total_count', 'totalCount', 'total']) ?? 0;
  const totalPages = readNumberValue(source, ['total_pages', 'totalPages'])
    ?? Math.max(1, Math.ceil(totalRecords / Math.max(1, limit)));

  return {
    currentPage,
    totalPages: Math.max(1, totalPages),
    totalRecords,
    limit,
  };
};

export function useCustomerOutstanding(
  enabled: boolean,
  customerId?: number | string,
  page?: number,
  limit = 10,
): UseCustomerOutstandingResult {
  const hasCustomerFilter = typeof customerId !== 'undefined' && customerId !== '';
  const requestPage = page ?? 1;
  const [rows, setRows] = useState<CustomerBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<CustomerOutstandingPagination | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const runRequest = useEffectEvent(() => getCustomerOutstanding({
    pageNo: requestPage,
    limit,
    status: 1,
    ...(hasCustomerFilter ? { customerId } : {}),
  }));

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setError('');
      setIsLoading(false);
      setPagination(null);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const payload = await runRequest();
        const mappedRows = mapCustomerBalanceResponse(payload);
        const mappedPagination = readPagination(payload);

        if (!isCancelled) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Customers Outstanding][Hook] Raw API response:', payload);
            console.log('[Customers Outstanding][Hook] Parsed rows:', mappedRows);
            console.log('[Customers Outstanding][Hook] Parsed pagination:', mappedPagination);
          }
          setRows(mappedRows);
          setPagination(mappedPagination);
        }
      } catch (requestError) {
        if (isCancelled) return;

        if (requestError instanceof AppApiError && requestError.statusCode === 501) {
          setRows([]);
          setPagination(null);
          setError('');
          return;
        }

        setRows([]);
        setPagination(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load the latest records.',
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [enabled, String(customerId ?? ''), requestPage, limit, reloadToken]);

  return {
    rows,
    isLoading,
    error,
    pagination,
    reload: () => setReloadToken((current) => current + 1),
  };
}
