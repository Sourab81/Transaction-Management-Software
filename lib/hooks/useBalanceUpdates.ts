'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  createFallbackPagination,
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';
import {
  getBalanceUpdates,
  mapBalanceUpdatesResponse,
  type BalanceUpdateMode,
  type BalanceUpdateRecord,
} from '../api/balanceUpdates';
import { usePersistentPageSize } from './usePersistentPageSize';

interface UseBalanceUpdatesResult {
  updates: BalanceUpdateRecord[];
  pagination: BackendPagination;
  isLoading: boolean;
  error: string;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reload: () => void;
}

export function useBalanceUpdates(
  enabled: boolean,
  mode: BalanceUpdateMode,
  dateFrom: string,
  dateTo: string,
): UseBalanceUpdatesResult {
  const [page, setPage] = useState(1);
  const [updates, setUpdates] = useState<BalanceUpdateRecord[]>([]);
  const [pagination, setPagination] = useState<BackendPagination>(() => createFallbackPagination(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${dateFrom}|${dateTo}|${mode}`;
  const previousKey = useRef(key);
  const { pageSize: limit, setPageSize, isPageSizeReady } = usePersistentPageSize('balance_updates_page_size');
  const runGetBalanceUpdates = useEffectEvent(getBalanceUpdates);

  useEffect(() => {
    if (!enabled || !isPageSizeReady) return;

    if (previousKey.current !== key) {
      previousKey.current = key;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let cancelled = false;
    setIsLoading(true);
    setError('');

    void runGetBalanceUpdates({ mode, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, pageNo: page, limit })
      .then((payload) => {
        if (cancelled) return;
        const rows = mapBalanceUpdatesResponse(payload);
        setUpdates(rows);
        setPagination(readBackendPagination(payload, rows.length, page, limit));
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setUpdates([]);
        setPagination(createFallbackPagination(0, page, limit));
        setError(requestError instanceof Error ? requestError.message : 'Unable to load balance updates.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, enabled, isPageSizeReady, limit, page, reloadToken]);

  return useMemo(() => ({
    updates,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit: (nextLimit: number) => {
      setPageSize(nextLimit);
      setPage(1);
    },
    reload: () => setReloadToken((current) => current + 1),
  }), [error, isLoading, pagination, setPageSize, updates]);
}
