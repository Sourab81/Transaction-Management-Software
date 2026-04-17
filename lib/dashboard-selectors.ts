import { useMemo } from 'react';
import {
  createEmptyBusinessWorkspace,
  getBusinessWorkspace,
  getRecentServicesFromTransactions,
  type AppState,
} from './store';
import {
  getSearchMatches,
  getTransactionSummary,
  getVisibleCustomers,
  getVisibleTransactions,
  getVisibleServices,
} from './dashboard-controller';
import type { SessionUser } from './auth-session';
import type { Business, BusinessCustomer } from './store';

export function useDashboardWorkspace(
  state: AppState,
  currentRole: SessionUser['role'],
  businessId?: string,
) {
  return useMemo(() => {
    if (currentRole === 'Admin') {
      return createEmptyBusinessWorkspace();
    }

    return getBusinessWorkspace(state, businessId);
  }, [state, currentRole, businessId]);
}

export function useRecentServices(transactions: AppState['businessWorkspacesById'][string]['transactions']) {
  return useMemo(() => getRecentServicesFromTransactions(transactions), [transactions]);
}

export function useVisibleCustomerRecords(
  accessContext: Parameters<typeof getVisibleCustomers>[0],
  customers: Array<Business | BusinessCustomer>,
) {
  return useMemo(() => getVisibleCustomers(accessContext, customers), [accessContext, customers]);
}

export function useVisibleTransactionRecords(
  accessContext: Parameters<typeof getVisibleTransactions>[0],
  transactions: Parameters<typeof getVisibleTransactions>[1],
) {
  return useMemo(() => getVisibleTransactions(accessContext, transactions), [accessContext, transactions]);
}

export function useTransactionStats(transactions: Parameters<typeof getTransactionSummary>[0]) {
  return useMemo(() => getTransactionSummary(transactions), [transactions]);
}

export function useSearchResults(params: Parameters<typeof getSearchMatches>[0]) {
  return useMemo(() => getSearchMatches(params), [
    params.context,
    params.query,
    params.services,
    params.customers,
    params.transactions,
  ]);
}
