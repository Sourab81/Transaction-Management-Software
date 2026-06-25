'use client';

import { useCallback, useEffect, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = typeof PAGE_SIZE_OPTIONS[number];

const isPageSize = (value: number): value is PageSize =>
  PAGE_SIZE_OPTIONS.includes(value as PageSize);

export function usePersistentPageSize(storageKey: string, defaultValue: PageSize = 10) {
  const [pageSize, setPageSizeState] = useState<PageSize>(defaultValue);
  const [isPageSizeReady, setIsPageSizeReady] = useState(false);

  useEffect(() => {
    setIsPageSizeReady(true);
  }, [storageKey]);

  const setPageSize = useCallback((value: number) => {
    const nextValue = isPageSize(value) ? value : defaultValue;
    setPageSizeState(nextValue);
    window.localStorage.setItem(storageKey, String(nextValue));
  }, [defaultValue, storageKey]);

  return { pageSize, setPageSize, isPageSizeReady };
}
