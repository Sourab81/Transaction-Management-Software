import { useDeferredValue, useMemo } from 'react';
import {
  createEmptyBusinessWorkspace,
  getBusinessWorkspace,
  getRecentServicesFromTransactions,
  useAppState,
  type AppState,
  type Business,
  type BusinessCustomer,
  type Transaction,
} from './store';
import {
  getSearchMatches,
  getTransactionSummary,
  getVisibleCustomers,
  getVisibleTransactions,
  getVisibleServices,
} from './dashboard-controller';
import type { SessionUser } from './auth-session';
import { isPermissionEnabled } from './platform-structure';

interface TransactionRecordFilters {
  query: string;
  status: 'All' | Transaction['status'];
  paymentMode: 'All' | Transaction['paymentMode'];
  department: string;
  handler: string;
  dateFrom: string;
  dateTo: string;
}

export function useBusinesses() {
  return useAppState().businesses;
}

export function useAdminWorkspaceData() {
  return useAppState().adminWorkspace;
}

export function useBusinessWorkspacesById() {
  return useAppState().businessWorkspacesById;
}

export function useBusinessRecord(businessId?: string) {
  const businesses = useBusinesses();

  return useMemo(() => {
    if (!businessId) {
      return null;
    }

    return businesses.find((business) => business.id === businessId) || null;
  }, [businessId, businesses]);
}

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

export function useRoleScopedWorkspace(
  currentRole: SessionUser['role'],
  businessId?: string,
) {
  const state = useAppState();
  return useDashboardWorkspace(state, currentRole, businessId);
}

export function useBusinessWorkspaceData(businessId?: string) {
  const state = useAppState();

  return useMemo(() => getBusinessWorkspace(state, businessId), [businessId, state]);
}

export function useRecentServices(transactions: AppState['businessWorkspacesById'][string]['transactions']) {
  return useMemo(() => getRecentServicesFromTransactions(transactions), [transactions]);
}

export function useVisibleServiceRecords(
  accessContext: Parameters<typeof getVisibleServices>[0],
  services: Parameters<typeof getVisibleServices>[1],
) {
  return useMemo(() => getVisibleServices(accessContext, services), [accessContext, services]);
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

export function useSortedTransactionRecords(transactions: Transaction[]) {
  return useMemo(
    () => [...transactions].sort((left, right) => right.date.localeCompare(left.date)),
    [transactions],
  );
}

export function useFilteredBusinesses(
  businesses: Business[],
  permissionFilter: string,
) {
  return useMemo(() => {
    if (permissionFilter === 'all') {
      return businesses;
    }

    return businesses.filter((business) =>
      isPermissionEnabled(business.permissions, permissionFilter)
    );
  }, [businesses, permissionFilter]);
}

export function useTransactionFilterOptions(transactions: Transaction[]) {
  return useMemo(() => ({
    departments: Array.from(new Set(transactions.map((transaction) => transaction.departmentName).filter(Boolean))),
    handlers: Array.from(new Set(transactions.map((transaction) => transaction.handledByName).filter(Boolean))),
  }), [transactions]);
}

export function useFilteredTransactionRecords(
  transactions: Transaction[],
  filters: TransactionRecordFilters,
) {
  const deferredQuery = useDeferredValue(filters.query.trim().toLowerCase());

  return useMemo(() => transactions.filter((transaction) => {
    const matchesQuery = !deferredQuery || [
      transaction.transactionNumber,
      transaction.customerName,
      transaction.customerPhone,
      transaction.service,
      transaction.paymentMode,
      transaction.departmentName,
      transaction.handledByName,
    ]
      .join(' ')
      .toLowerCase()
      .includes(deferredQuery);
    const matchesStatus = filters.status === 'All' || transaction.status === filters.status;
    const matchesPaymentMode = filters.paymentMode === 'All' || transaction.paymentMode === filters.paymentMode;
    const matchesDepartment = filters.department === 'All' || transaction.departmentName === filters.department;
    const matchesHandler = filters.handler === 'All' || transaction.handledByName === filters.handler;
    const matchesFromDate = !filters.dateFrom || transaction.date >= filters.dateFrom;
    const matchesToDate = !filters.dateTo || transaction.date <= filters.dateTo;

    return matchesQuery && matchesStatus && matchesPaymentMode && matchesDepartment && matchesHandler && matchesFromDate && matchesToDate;
  }), [
    deferredQuery,
    filters.dateFrom,
    filters.dateTo,
    filters.department,
    filters.handler,
    filters.paymentMode,
    filters.status,
    transactions,
  ]);
}

export function useCustomerSearchMatches(
  customers: BusinessCustomer[],
  query: string,
  limit = 5,
) {
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  return useMemo(() => {
    if (!deferredQuery) {
      return [];
    }

    return customers
      .filter((customer) =>
        `${customer.name} ${customer.phone} ${customer.email || ''}`.toLowerCase().includes(deferredQuery)
      )
      .slice(0, limit);
  }, [customers, deferredQuery, limit]);
}

export function useSearchResults(params: Parameters<typeof getSearchMatches>[0]) {
  const normalizedQuery = useDeferredValue(params.query.trim());

  if (!normalizedQuery) {
    return {
      services: [],
      customers: [],
      transactions: [],
    };
  }

  return getSearchMatches({
    ...params,
    query: normalizedQuery,
  });
}
