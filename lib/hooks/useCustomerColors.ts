'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCustomerColors,
  saveCustomerColor,
  type CustomerColor,
  type CustomerColorPayload,
} from '../api/customerColors';

export function useCustomerColors() {
  const [colors, setColors] = useState<CustomerColor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      setColors(await getCustomerColors());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load customer colors.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveColor = useCallback(async (payload: CustomerColorPayload, id?: string) => {
    try {
      const result = await saveCustomerColor(payload, id);
      if (result.success) {
        await reload();
      }
      setError('');
      return result;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save color.';
      setError(message);
      return { success: false, message };
    }
  }, [reload]);

  const activeColors = useMemo(
    () => colors.filter((color) => color.status === 'Active'),
    [colors],
  );

  return {
    colors,
    activeColors,
    isLoading,
    error,
    reload,
    saveColor,
  };
}
