'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { fetchBusinessDirectoryPage } from '../api/business-users';
import {
  createFallbackPagination,
  type BackendPagination,
} from '../api/pagination';
import {
  mapBusinessesPageResponse,
} from '../mappers/business-mapper';
import type { Business } from '../store';
import { usePersistentPageSize } from './usePersistentPageSize';

interface UseBackendBusinessesResult {
  businesses: Business[];
  pagination: BackendPagination;
  isLoading: boolean;
  error: string;
  page: number;
  limit: number;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  reload: () => void;
}

export function useBackendBusinesses(
  enabled: boolean,
  initialData?: Business[],
  pageSize = 10,
): UseBackendBusinessesResult {
  const [page, setPage] = useState(1);
  const {
    pageSize: limit,
    setPageSize: setLimitState,
    isPageSizeReady,
  } = usePersistentPageSize('business_users_page_size', pageSize === 25 || pageSize === 50 || pageSize === 100 ? pageSize : 10);
  const [reloadToken, setReloadToken] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>(() => initialData ?? []);
  const [pagination, setPagination] = useState<BackendPagination>(() =>
    createFallbackPagination(initialData?.length ?? 0, 1, limit)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const runRequest = useEffectEvent(fetchBusinessDirectoryPage);

  useEffect(() => {
    if (!enabled || !isPageSizeReady) {
      setBusinesses([]);
      setPagination(createFallbackPagination(0, 1, limit));
      setError('');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const result = await runRequest({ page, limit });

        if (!result.ok) {
          if (!isCancelled) {
            setBusinesses([]);
            setPagination(createFallbackPagination(0, page, limit));
            setError(result.statusCode === 501 ? '' : result.error);
          }
          return;
        }

        const mappedPage = mapBusinessesPageResponse(result.payload, page, limit);

        if (!isCancelled) {
          setBusinesses(mappedPage.businesses);
          setPagination(mappedPage.pagination);
        }
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        setBusinesses([]);
        setPagination(createFallbackPagination(0, page, limit));
        setError(requestError instanceof Error ? requestError.message : 'Unable to load business users.');
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
  }, [enabled, isPageSizeReady, limit, page, reloadToken]);

  const setLimit = (nextLimit: number) => {
    setLimitState(nextLimit);
    setPage(1);
  };

  return useMemo(() => ({
    businesses,
    pagination,
    isLoading,
    error,
    page,
    limit,
    setLimit,
    setPage,
    reload: () => setReloadToken((current) => current + 1),
  }), [businesses, error, isLoading, limit, page, pagination]);
}
