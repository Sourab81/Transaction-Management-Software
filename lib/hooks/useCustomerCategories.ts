'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCustomerCategories,
  saveCustomerCategory,
  type CustomerCategory,
  type CustomerCategoryPayload,
} from '../api/customerCategories';

export function useCustomerCategories() {
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      setCategories(await getCustomerCategories());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load customer categories.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveCategory = useCallback(async (payload: CustomerCategoryPayload, id?: string) => {
    try {
      const result = await saveCustomerCategory(payload, id);
      if (result.success) {
        await reload();
      }
      setError('');
      return result;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save category.';
      setError(message);
      return { success: false, message };
    }
  }, [reload]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.status === 'Active'),
    [categories],
  );

  return {
    categories,
    activeCategories,
    isLoading,
    error,
    reload,
    saveCategory,
  };
}
