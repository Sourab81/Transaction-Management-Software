'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  createFallbackPagination,
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';
import {
  getCashDeposits,
  mapCashDepositsResponse,
  mapCashDepositSummary,
  type CashDepositRecord,
  type CashDepositSummary,
} from '../api/cashDeposits';
import { usePersistentPageSize } from './usePersistentPageSize';

interface UseCashDepositsResult {
  deposits: CashDepositRecord[];
  summary: CashDepositSummary;
  pagination: BackendPagination;
  isLoading: boolean;
  error: string;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reload: () => void;
}

const emptySummary: CashDepositSummary = {
  todayDeposits: 0,
  todayTotalAmount: 0,
};

export function useCashDeposits(
  enabled: boolean,
  date: string,
): UseCashDepositsResult {
  const [page, setPage] = useState(1);
  const [deposits, setDeposits] = useState<CashDepositRecord[]>([]);
  const [summary, setSummary] = useState<CashDepositSummary>(emptySummary);
  const [pagination, setPagination] = useState<BackendPagination>(() => createFallbackPagination(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const previousDate = useRef(date);
  const { pageSize: limit, setPageSize, isPageSizeReady } = usePersistentPageSize('cash_deposits_page_size');
  const runGetCashDeposits = useEffectEvent(getCashDeposits);

  useEffect(() => {
    if (!enabled || !isPageSizeReady) return;

    if (previousDate.current !== date) {
      previousDate.current = date;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let cancelled = false;
    setIsLoading(true);
    setError('');

    void runGetCashDeposits({ date, pageNo: page, limit })
      .then((payload) => {
        if (cancelled) return;
        const rows = mapCashDepositsResponse(payload);
        setDeposits(rows);
        setSummary(mapCashDepositSummary(payload));
        setPagination(readBackendPagination(payload, rows.length, page, limit));
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setDeposits([]);
        setSummary(emptySummary);
        setPagination(createFallbackPagination(0, page, limit));
        setError(requestError instanceof Error ? requestError.message : 'Unable to load cash deposits.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, enabled, isPageSizeReady, limit, page, reloadToken]);

  return useMemo(() => ({
    deposits,
    summary,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit: (nextLimit: number) => {
      setPageSize(nextLimit);
      setPage(1);
    },
    reload: () => setReloadToken((current) => current + 1),
  }), [deposits, error, isLoading, pagination, setPageSize, summary]);
}
