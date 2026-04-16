import {
  canAccessModuleForSession,
  canUseBusinessFeature,
  hasAnyEnabledPermission,
  type BusinessFeatureAction,
  type SessionAccessContext,
} from './platform-structure';
import type { Business, BusinessCustomer, Service, Transaction } from './store';

const employeeManageableModules = new Set(['services', 'customers', 'accounts', 'transactions', 'history', 'reports']);
const businessManageableModules = new Set(['customers', 'employee', 'departments', 'services', 'accounts', 'expense', 'reports', 'transactions']);
const businessDeletableModules = new Set(['customers', 'employee', 'departments', 'services', 'accounts', 'expense', 'reports']);
const adminManageableModules = new Set(['customers', 'reports', 'additions']);
const adminDeletableModules = new Set(['customers', 'history', 'reports', 'additions']);

const canViewBusinessRecords = (context: SessionAccessContext, moduleId: string) => {
  switch (moduleId) {
    case 'customers':
      return hasAnyEnabledPermission(context.permissions, [
        'customers.list',
        'customers.payment_list',
        'customers.outstanding',
      ]);
    case 'employee':
      return hasAnyEnabledPermission(context.permissions, [
        'employee.list',
        'employee.salary',
        'employee.outstanding',
      ]);
    case 'services':
    case 'accounts':
    case 'departments':
    case 'reports':
    case 'expense':
      return canUseBusinessFeature(context.permissions, moduleId, 'view');
    default:
      return false;
  }
};

export const canViewModuleRecordsForSession = (context: SessionAccessContext, moduleId: string) => {
  if (!canAccessModuleForSession(context, moduleId)) return false;
  if (context.role === 'Admin') return true;
  if (context.role === 'Customer' || context.role === 'Employee') {
    return canViewBusinessRecords(context, moduleId);
  }

  return false;
};

export const canPerformModuleActionForSession = (
  context: SessionAccessContext,
  moduleId: string,
  action: Exclude<BusinessFeatureAction, 'view'>,
) => {
  if (!canAccessModuleForSession(context, moduleId)) return false;

  if (context.role === 'Admin') {
    return action === 'delete'
      ? adminDeletableModules.has(moduleId)
      : adminManageableModules.has(moduleId);
  }

  if (context.role === 'Customer') {
    if (businessManageableModules.has(moduleId) || businessDeletableModules.has(moduleId)) {
      if (action === 'delete' && !businessDeletableModules.has(moduleId)) return false;
      if (action !== 'delete' && !businessManageableModules.has(moduleId)) return false;

      return canUseBusinessFeature(context.permissions, moduleId, action);
    }

    return false;
  }

  if (context.role === 'Employee') {
    if (action === 'delete') return false;
    if (!employeeManageableModules.has(moduleId)) return false;

    if (businessManageableModules.has(moduleId)) {
      return canUseBusinessFeature(context.permissions, moduleId, action);
    }

    return true;
  }

  return false;
};

export const canManageModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  return (
    canPerformModuleActionForSession(context, moduleId, 'add') ||
    canPerformModuleActionForSession(context, moduleId, 'edit')
  );
};

export const canDeleteModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  return canPerformModuleActionForSession(context, moduleId, 'delete');
};

export const canDeleteRecordsForRole = (role: SessionAccessContext['role']) => role === 'Admin';

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
  return transactions;
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
  return {
    totalVolume: transactions.reduce((total, item) => total + item.totalAmount, 0),
    completed: transactions.filter((item) => item.status === 'completed').length,
    pending: transactions.filter((item) => item.status === 'pending').length,
    disputes: transactions.filter((item) => item.status === 'cancelled' || item.status === 'refunded').length,
  };
};
