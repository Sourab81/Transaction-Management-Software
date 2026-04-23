'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { AppApiError } from '../api/app-client';

interface UseApiResourceOptions<T> {
  enabled: boolean;
  initialData?: T | null;
  request: () => Promise<unknown>;
  mapResponse: (payload: unknown) => T | null;
}

interface UseApiResourceResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useApiResource<T>({
  enabled,
  initialData,
  request,
  mapResponse,
}: UseApiResourceOptions<T>): UseApiResourceResult<T> {
  const hasInitialData = typeof initialData !== 'undefined';
  const [data, setData] = useState<T | null>(() => initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const runRequest = useEffectEvent(request);
  const runMapResponse = useEffectEvent(mapResponse);

  useEffect(() => {
    if (!enabled) {
      setData(initialData ?? null);
      setError('');
      setIsLoading(false);
      return;
    }

    if (reloadToken === 0 && hasInitialData) {
      setError('');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const payload = await runRequest();

        if (!isCancelled) {
          setData(runMapResponse(payload));
        }
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        if (requestError instanceof AppApiError && requestError.statusCode === 501) {
          setData(null);
          setError('');
          return;
        }

        setData(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load the latest summary.',
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
  }, [enabled, hasInitialData, initialData, reloadToken]);

  return {
    data,
    isLoading,
    error,
    reload: () => setReloadToken((current) => current + 1),
  };
}
