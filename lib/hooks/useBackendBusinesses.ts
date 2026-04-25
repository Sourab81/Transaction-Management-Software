'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { fetchBusinessDirectoryPage } from '../actions/business-directory-actions';
import {
  createFallbackPagination,
  type BackendPagination,
} from '../api/pagination';
import {
  mapBusinessesPageResponse,
} from '../mappers/business-mapper';
import type { Business } from '../store';

interface UseBackendBusinessesResult {
  businesses: Business[];
  pagination: BackendPagination;
  isLoading: boolean;
  error: string;
  page: number;
  setPage: (page: number) => void;
  reload: () => void;
}

export function useBackendBusinesses(
  enabled: boolean,
  initialData?: Business[],
  pageSize = 10,
): UseBackendBusinessesResult {
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>(() => initialData ?? []);
  const [pagination, setPagination] = useState<BackendPagination>(() =>
    createFallbackPagination(initialData?.length ?? 0, 1, pageSize)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const runRequest = useEffectEvent(fetchBusinessDirectoryPage);

  useEffect(() => {
    if (!enabled) {
      setBusinesses([]);
      setPagination(createFallbackPagination(0, 1, pageSize));
      setError('');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const result = await runRequest({ page, limit: pageSize });

        if (!result.ok) {
          if (!isCancelled) {
            setBusinesses([]);
            setPagination(createFallbackPagination(0, page, pageSize));
            setError(result.statusCode === 501 ? '' : result.error);
          }
          return;
        }

        const mappedPage = mapBusinessesPageResponse(result.payload, page, pageSize);

        if (!isCancelled) {
          setBusinesses(mappedPage.businesses);
          setPagination(mappedPage.pagination);
        }
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        setBusinesses([]);
        setPagination(createFallbackPagination(0, page, pageSize));
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
  }, [enabled, page, pageSize, reloadToken]);

  return useMemo(() => ({
    businesses,
    pagination,
    isLoading,
    error,
    page,
    setPage,
    reload: () => setReloadToken((current) => current + 1),
  }), [businesses, error, isLoading, page, pagination]);
}
