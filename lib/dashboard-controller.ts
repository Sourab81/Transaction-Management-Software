import type {
  BusinessFeatureAction,
  SessionAccessContext,
} from './platform-structure';
import {
  canDeleteModuleForSession as canDeleteModuleForSessionCore,
  canDeleteRecordsForRole as canDeleteRecordsForRoleCore,
  canManageModuleForSession as canManageModuleForSessionCore,
  canPerformModuleActionForSession as canPerformModuleActionForSessionCore,
  canViewModuleRecordsForSession as canViewModuleRecordsForSessionCore,
} from './permissions/module-actions';
import { canAccessModuleForSession } from './permissions/session-access';
import type { Business, BusinessCustomer, Service, Transaction } from './store';

export const canViewModuleRecordsForSession = (context: SessionAccessContext, moduleId: string) => {
  return canViewModuleRecordsForSessionCore(context, moduleId);
};

export const canPerformModuleActionForSession = (
  context: SessionAccessContext,
  moduleId: string,
  action: Exclude<BusinessFeatureAction, 'view'>,
) => {
  return canPerformModuleActionForSessionCore(context, moduleId, action);
};

export const canManageModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  return canManageModuleForSessionCore(context, moduleId);
};

export const canDeleteModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  return canDeleteModuleForSessionCore(context, moduleId);
};

export const canDeleteRecordsForRole = (role: SessionAccessContext['role']) =>
  canDeleteRecordsForRoleCore(role);

const getActiveTransactions = (transactions: Transaction[]) =>
  transactions.filter((transaction) => !transaction.isDeleted);

export const getVisibleServices = (context: SessionAccessContext, services: Service[]) => {
  return canAccessModuleForSession(context, 'services') ? services : [];
};

export const getVisibleCustomers = (
  context: SessionAccessContext,
  customers: Array<BusinessCustomer | Business>
) => {
  return canViewModuleRecordsForSession(context, 'customers') ? customers : [];
};

export const getVisibleTransactions = (
  context: SessionAccessContext,
  transactions: Transaction[],
) => {
  if (!canAccessModuleForSession(context, 'transactions')) return [];
  return getActiveTransactions(transactions);
};

interface SearchRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface SearchInput {
  context: SessionAccessContext;
  query: string;
  services: Service[];
  customers: SearchRecord[];
  transactions: Transaction[];
}

export const getSearchMatches = ({
  context,
  query,
  services,
  customers,
  transactions,
}: SearchInput) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return {
      services: [],
      customers: [],
      transactions: [],
    };
  }

  const visibleServices = getVisibleServices(context, services);
  const visibleCustomers = getVisibleCustomers(context, customers);
  const visibleTransactions = getVisibleTransactions(context, transactions);

  return {
    services: visibleServices.filter((service) =>
      `${service.name} ${service.category} ${service.description} ${service.departmentName}`.toLowerCase().includes(normalizedQuery),
    ),
    customers: visibleCustomers.filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.email || ''}`.toLowerCase().includes(normalizedQuery),
    ),
    transactions: visibleTransactions.filter((transaction) =>
      `${transaction.transactionNumber} ${transaction.customerName} ${transaction.customerPhone} ${transaction.service} ${transaction.paymentMode} ${transaction.status} ${transaction.departmentName} ${transaction.handledByName}`.toLowerCase().includes(normalizedQuery),
    ),
  };
};

export const getTransactionSummary = (transactions: Transaction[]) => {
  const activeTransactions = getActiveTransactions(transactions);

  return {
    totalVolume: activeTransactions.reduce((total, item) => total + item.totalAmount, 0),
    completed: activeTransactions.filter((item) => item.status === 'completed').length,
    pending: activeTransactions.filter((item) => item.status === 'pending').length,
    disputes: activeTransactions.filter((item) => item.status === 'cancelled' || item.status === 'refunded').length,
  };
};
