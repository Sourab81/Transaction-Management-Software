'use client';

import type { Account } from '../store';
import { getAccountsResponse } from '../api/accounts';
import { mapAccountsResponse } from '../mappers/account-mapper';
import { useApiCollection } from './useApiCollection';

interface UseAccountsResult {
  accounts: Account[];
  isLoading: boolean;
  error: string;
  hasLoaded: boolean;
  reload: () => void;
}

export function useAccounts(
  enabled: boolean,
  initialData?: Account[],
  revalidateOnMount = false,
): UseAccountsResult {
  const { data, isLoading, error, hasLoaded, reload } = useApiCollection({
    enabled,
    initialData,
    revalidateOnMount,
    request: getAccountsResponse,
    mapResponse: mapAccountsResponse,
  });

  return {
    accounts: data,
    isLoading,
    error,
    hasLoaded,
    reload,
  };
}
