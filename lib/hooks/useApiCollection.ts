'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { AppApiError } from '../api/app-client';

interface UseApiCollectionOptions<T> {
  enabled: boolean;
  initialData?: T[];
  revalidateOnMount?: boolean;
  request: () => Promise<unknown>;
  mapResponse: (payload: unknown) => T[];
}

interface UseApiCollectionResult<T> {
  data: T[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export function useApiCollection<T>({
  enabled,
  initialData,
  revalidateOnMount = false,
  request,
  mapResponse,
}: UseApiCollectionOptions<T>): UseApiCollectionResult<T> {
  const hasInitialData = typeof initialData !== 'undefined';
  const [data, setData] = useState<T[]>(() => initialData ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const runRequest = useEffectEvent(request);
  const runMapResponse = useEffectEvent(mapResponse);

  useEffect(() => {
    if (!enabled) {
      setData(initialData ?? []);
      setError('');
      setIsLoading(false);
      return;
    }

    if (reloadToken === 0 && hasInitialData && !revalidateOnMount) {
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
          setData([]);
          setError('');
          return;
        }

        setData([]);
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
  }, [enabled, hasInitialData, initialData, reloadToken, revalidateOnMount]);

  return {
    data,
    isLoading,
    error,
    reload: () => setReloadToken((current) => current + 1),
  };
}
