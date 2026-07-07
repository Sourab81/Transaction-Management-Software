'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  createFallbackPagination,
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';
import {
  getBalanceTransfers,
  mapBalanceTransfersResponse,
  type BalanceTransferMode,
  type BalanceTransferRecord,
} from '../api/balanceTransfers';
import { usePersistentPageSize } from './usePersistentPageSize';

interface UseBalanceTransfersResult {
  transfers: BalanceTransferRecord[];
  pagination: BackendPagination;
  isLoading: boolean;
  error: string;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reload: () => void;
}

export function useBalanceTransfers(
  enabled: boolean,
  mode: BalanceTransferMode,
  dateFrom: string,
  dateTo: string,
): UseBalanceTransfersResult {
  const [page, setPage] = useState(1);
  const [transfers, setTransfers] = useState<BalanceTransferRecord[]>([]);
  const [pagination, setPagination] = useState<BackendPagination>(() => createFallbackPagination(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${dateFrom}|${dateTo}|${mode}`;
  const previousKey = useRef(key);
  const { pageSize: limit, setPageSize, isPageSizeReady } = usePersistentPageSize('balance_transfers_page_size');
  const runGetBalanceTransfers = useEffectEvent(getBalanceTransfers);

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

    void runGetBalanceTransfers({ mode, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, pageNo: page, limit })
      .then((payload) => {
        if (cancelled) return;
        const rows = mapBalanceTransfersResponse(payload);
        setTransfers(rows);
        setPagination(readBackendPagination(payload, rows.length, page, limit));
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setTransfers([]);
        setPagination(createFallbackPagination(0, page, limit));
        setError(requestError instanceof Error ? requestError.message : 'Unable to load balance transfers.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, enabled, isPageSizeReady, limit, page, reloadToken]);

  return useMemo(() => ({
    transfers,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit: (nextLimit: number) => {
      setPageSize(nextLimit);
      setPage(1);
    },
    reload: () => setReloadToken((current) => current + 1),
  }), [error, isLoading, pagination, setPageSize, transfers]);
}
