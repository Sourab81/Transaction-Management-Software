'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  createFallbackPagination,
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';
import { usePersistentPageSize } from './usePersistentPageSize';

interface ServerPaginationOptions<TRecord> {
  enabled: boolean;
  storageKey: string;
  requestKey?: string;
  request: (page: number, limit: number) => Promise<unknown>;
  mapResponse: (payload: unknown) => TRecord[];
}

export function useServerPagination<TRecord>({
  enabled,
  storageKey,
  requestKey = '',
  request,
  mapResponse,
}: ServerPaginationOptions<TRecord>) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TRecord[]>([]);
  const [pagination, setPagination] = useState<BackendPagination>(() => createFallbackPagination(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const previousRequestKey = useRef(requestKey);
  const { pageSize: limit, setPageSize, isPageSizeReady } = usePersistentPageSize(storageKey);
  const runRequest = useEffectEvent(request);
  const runMapper = useEffectEvent(mapResponse);

  useEffect(() => {
    if (!enabled || !isPageSizeReady) return;
    if (previousRequestKey.current !== requestKey) {
      previousRequestKey.current = requestKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let cancelled = false;
    setIsLoading(true);
    setError('');

    void runRequest(page, limit)
      .then((payload) => {
        if (cancelled) return;
        const nextRows = runMapper(payload);
        setRows(nextRows);
        setPagination(readBackendPagination(payload, nextRows.length, page, limit));
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setRows([]);
        setPagination(createFallbackPagination(0, page, limit));
        setError(requestError instanceof Error ? requestError.message : 'Unable to load records.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, isPageSizeReady, limit, page, reloadToken, requestKey]);

  return useMemo(() => ({
    rows,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit: (nextLimit: number) => {
      setPageSize(nextLimit);
      setPage(1);
    },
    reload: () => setReloadToken((current) => current + 1),
  }), [error, isLoading, pagination, rows, setPageSize]);
}
