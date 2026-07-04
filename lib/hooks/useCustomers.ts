'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { BusinessCustomer } from '../store';
import { getCustomers, type CustomerFilters } from '../api/customers';
import {
  createFallbackPagination,
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';
import { DirectBackendError } from '../api/direct-backend';
import { mapCustomersResponse } from '../mappers/customer-mapper';
import { usePersistentPageSize } from './usePersistentPageSize';

interface UseCustomersResult {
  customers: BusinessCustomer[];
  pagination: BackendPagination;
  isLoading: boolean;
  error: string;
  page: number;
  limit: number;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  reload: () => void;
}

export function useCustomers(
  enabled: boolean,
  initialData?: BusinessCustomer[],
  filters: CustomerFilters = {},
  pageSize = 10,
): UseCustomersResult {
  const [page, setPage] = useState(filters.pageNo || filters.page || 1);
  const {
    pageSize: limit,
    setPageSize: setLimitState,
    isPageSizeReady,
  } = usePersistentPageSize('customers_page_size', pageSize === 25 || pageSize === 50 || pageSize === 100 ? pageSize : 10);
  const [reloadToken, setReloadToken] = useState(0);
  const [customers, setCustomers] = useState<BusinessCustomer[]>(() => initialData ?? []);
  const [pagination, setPagination] = useState<BackendPagination>(() =>
    createFallbackPagination(initialData?.length ?? 0, 1, limit)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const filterResetKey = JSON.stringify({
    limit,
    search: filters.search?.trim() || '',
    status: filters.status ?? '',
  });
  const requestFilters = useMemo(() => ({
    ...filters,
    pageNo: page,
    limit,
  }), [filters, limit, page]);
  const requestKey = JSON.stringify(requestFilters);
  const runRequest = useEffectEvent(getCustomers);

  useEffect(() => {
    setPage(1);
  }, [filterResetKey]);

  useEffect(() => {
    if (!enabled || !isPageSizeReady) {
      setCustomers(initialData ?? []);
      setPagination(createFallbackPagination(initialData?.length ?? 0, 1, limit));
      setError('');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const payload = await runRequest(requestFilters);
        const mappedCustomers = mapCustomersResponse(payload);
        const nextPagination = readBackendPagination(
          payload,
          mappedCustomers.length,
          requestFilters.pageNo,
          requestFilters.limit,
        );

        if (!isCancelled) {
          setCustomers(mappedCustomers);
          setPagination(nextPagination);
        }
      } catch (requestError) {
        if (isCancelled) return;

        if (requestError instanceof DirectBackendError && requestError.statusCode === 501) {
          setCustomers([]);
          setPagination(createFallbackPagination(0, page, requestFilters.limit));
          setError('');
          return;
        }

        setCustomers([]);
        setPagination(createFallbackPagination(0, page, requestFilters.limit));
        setError(requestError instanceof Error ? requestError.message : 'Unable to load customers.');
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
  }, [enabled, initialData, isPageSizeReady, limit, page, reloadToken, requestKey]);

  const setLimit = (nextLimit: number) => {
    setLimitState(nextLimit);
    setPage(1);
  };

  return useMemo(() => ({
    customers,
    pagination,
    isLoading,
    error,
    page,
    limit,
    setLimit,
    setPage,
    reload: () => setReloadToken((current) => current + 1),
  }), [customers, error, isLoading, limit, page, pagination]);
}
