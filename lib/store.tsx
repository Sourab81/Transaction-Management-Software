'use client';

import React, { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import {
  buildDefaultCustomerPermissions,
  normalizeCustomerPermissions,
  type CustomerPermissions,
} from './platform-structure';
import {
  deriveTransactionStatus,
  type DailyClosingSummary,
} from './transaction-workflow';
import { getTransactionUpdateDelta, type BalanceDelta } from './transaction-accounting';
import {
  getBusinessAccessState,
  toStoredBusinessSubscription,
  type BusinessStatusReason,
  type BusinessSubscription,
} from './subscription';

export const createRecordId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export interface Business {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  status?: 'Active' | 'Inactive';
  statusReason?: BusinessStatusReason;
  joinedDate?: string;
  permissions: CustomerPermissions;
  onboardingCompleted?: boolean;
  onboardingStep?: BusinessOnboardingStep;
  subscription?: BusinessSubscription;
}

export type BusinessOnboardingStep = 'welcome' | 'departments' | 'accounts' | 'services' | 'customers' | 'dashboard';

export interface BusinessCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: 'Active' | 'Inactive';
  joinedDate?: string;
}

export type TransactionPaymentMode = 'cash' | 'upi' | 'bank' | 'card';
export type TransactionStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';
export type TransactionAuditAction = 'created' | 'updated' | 'cancelled' | 'refunded' | 'deleted';

export interface TransactionUpiPaymentDetails {
  kind: 'upi';
  transactionId: string;
  utrNumber: string;
}

export interface TransactionCardPaymentDetails {
  kind: 'card';
  transactionId: string;
  cardType: string;
  cardNetwork: string;
  lastFourDigits: string;
}

export interface TransactionBankPaymentDetails {
  kind: 'bank';
  bankTransferType: string;
  bankTransactionReferenceNumber: string;
  senderAccountHolderName: string;
  senderBankName: string;
  senderAccountNumber: string;
}

export type TransactionPaymentDetails =
  | TransactionUpiPaymentDetails
  | TransactionCardPaymentDetails
  | TransactionBankPaymentDetails;

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  permissions: CustomerPermissions;
  departmentId?: string;
  status?: 'Active' | 'Inactive';
  joinedDate?: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  service: string;
  servicePrice: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: TransactionPaymentMode;
  paymentDetails?: TransactionPaymentDetails;
  departmentId?: string;
  departmentName: string;
  accountId?: string;
  accountLabel: string;
  handledById: string;
  handledByName: string;
  handledByRole: 'Customer' | 'Employee';
  note?: string;
  status: TransactionStatus;
  date: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  lastAuditAction?: TransactionAuditAction;
  isDeleted?: boolean;
}

export interface Counter {
  id: string;
  name: string;
  code: string;
  linkedAccountIds?: string[];
  defaultAccountId?: string;
  linkedAccountId?: string;
  openingBalance: number;
  currentBalance: number;
  status: 'Active' | 'Inactive';
}

export interface Account {
  id: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  openingBalance: number;
  currentBalance: number;
  status: 'Active' | 'Inactive';
  date: string;
}

export interface Service {
  id: string;
  departmentId?: string;
  departmentName: string;
  name: string;
  category: string;
  price: number;
  status: 'Active' | 'Inactive';
  description: string;
}

export interface RecentService {
  id: string;
  name: string;
  customer: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Refunded';
}

export interface HistoryEvent {
  id: string;
  title: string;
  module: string;
  actor: string;
  status: 'Completed' | 'Pending' | 'Failed';
  date: string;
}

export interface ReportItem {
  id: string;
  name: string;
  type: string;
  owner: string;
  status: 'Ready' | 'Draft' | 'Scheduled';
  date: string;
  summary?: DailyClosingSummary;
}

export interface AdditionOption {
  id: string;
  title: string;
  category: string;
  description: string;
  status: 'Enabled' | 'Disabled';
  date: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  status: 'Active' | 'Inactive';
  date: string;
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

export interface BusinessWorkspace {
  customers: BusinessCustomer[];
  employees: Employee[];
  transactions: Transaction[];
  notifications: Notification[];
  counters: Counter[];
  accounts: Account[];
  services: Service[];
  expenses: Expense[];
  historyEvents: HistoryEvent[];
  reports: ReportItem[];
}

export interface AdminWorkspace {
  notifications: Notification[];
  historyEvents: HistoryEvent[];
  reports: ReportItem[];
  additionOptions: AdditionOption[];
}

export interface AppState {
  businesses: Business[];
  businessWorkspacesById: Record<string, BusinessWorkspace>;
  adminWorkspace: AdminWorkspace;
}

type WorkspaceScopedAction =
  | { type: 'ADD_TRANSACTION'; businessId: string; payload: Omit<Transaction, 'id' | 'date' | 'transactionNumber' | 'createdAt'> }
  | { type: 'UPDATE_TRANSACTION'; businessId: string; payload: Transaction }
  | { type: 'ADD_CUSTOMER'; businessId: string; payload: Omit<BusinessCustomer, 'id'> & { id?: string } }
  | { type: 'UPDATE_CUSTOMER'; businessId: string; payload: BusinessCustomer }
  | { type: 'ADD_EMPLOYEE'; businessId: string; payload: Omit<Employee, 'id'> }
  | { type: 'UPDATE_EMPLOYEE'; businessId: string; payload: Employee }
  | { type: 'ADD_COUNTER'; businessId: string; payload: Omit<Counter, 'id'> }
  | { type: 'UPDATE_COUNTER'; businessId: string; payload: Counter }
  | { type: 'ADD_ACCOUNT'; businessId: string; payload: Omit<Account, 'id' | 'date'> & { id?: string } }
  | { type: 'UPDATE_ACCOUNT'; businessId: string; payload: Account }
  | { type: 'ADD_SERVICE'; businessId: string; payload: Omit<Service, 'id'> & { id?: string } }
  | { type: 'UPDATE_SERVICE'; businessId: string; payload: Service }
  | { type: 'ADD_EXPENSE'; businessId: string; payload: Omit<Expense, 'id'> }
  | { type: 'UPDATE_EXPENSE'; businessId: string; payload: Expense }
  | { type: 'ADD_REPORT'; businessId?: string; payload: Omit<ReportItem, 'id' | 'date'> }
  | { type: 'ADD_HISTORY_EVENT'; businessId?: string; payload: Omit<HistoryEvent, 'id' | 'date'> }
  | { type: 'ADD_NOTIFICATION'; businessId?: string; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'DISMISS_NOTIFICATION'; businessId?: string; payload: string }
  | { type: 'DELETE_ACCOUNT'; businessId: string; payload: string }
  | { type: 'DELETE_SERVICE'; businessId: string; payload: string }
  | { type: 'DELETE_CUSTOMER'; businessId: string; payload: string }
  | { type: 'DELETE_EMPLOYEE'; businessId: string; payload: string }
  | { type: 'DELETE_COUNTER'; businessId: string; payload: string }
  | { type: 'DELETE_EXPENSE'; businessId: string; payload: string }
  | { type: 'DELETE_TRANSACTION'; businessId: string; payload: string | { id: string; deletedBy?: string; deleteReason?: string } }
  | { type: 'DELETE_HISTORY_EVENT'; businessId?: string; payload: string }
  | { type: 'DELETE_REPORT'; businessId?: string; payload: string };

type BusinessDirectoryAction =
  | { type: 'ADD_BUSINESS'; payload: Omit<Business, 'id'> }
  | { type: 'UPDATE_BUSINESS'; payload: Business }
  | { type: 'DELETE_BUSINESS'; payload: string };

type AdminAction =
  | { type: 'UPDATE_ADDITION_OPTION'; payload: AdditionOption }
  | { type: 'DELETE_ADDITION_OPTION'; payload: string };

type AppAction = WorkspaceScopedAction | BusinessDirectoryAction | AdminAction | { type: 'HYDRATE_APP_STATE'; payload: AppState };

const today = () => new Date().toISOString().split('T')[0];
const nowIso = () => new Date().toISOString();

const createTransactionNumber = () => {
  const now = new Date();
  const dateCode = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const timeCode = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const randomCode = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `TXN-${dateCode}-${timeCode}-${randomCode}`;
};

export const getDepartmentLinkedAccountIds = (
  counter?: Pick<Counter, 'linkedAccountIds' | 'linkedAccountId'> | null,
) => {
  const linkedAccountIds = [
    ...(counter?.linkedAccountIds ?? []),
    ...(counter?.linkedAccountId ? [counter.linkedAccountId] : []),
  ].filter(Boolean) as string[];

  return Array.from(new Set(linkedAccountIds));
};

export const getDepartmentDefaultAccountId = (
  counter?: Pick<Counter, 'linkedAccountIds' | 'linkedAccountId' | 'defaultAccountId'> | null,
) => {
  const linkedAccountIds = getDepartmentLinkedAccountIds(counter);

  if (counter?.defaultAccountId && linkedAccountIds.includes(counter.defaultAccountId)) {
    return counter.defaultAccountId;
  }

  return linkedAccountIds[0];
};

export const getDepartmentLinkedAccounts = (
  counter: Pick<Counter, 'linkedAccountIds' | 'linkedAccountId'> | null | undefined,
  accounts: Account[],
) => {
  const linkedAccountIds = new Set(getDepartmentLinkedAccountIds(counter));

  return accounts.filter((account) => linkedAccountIds.has(account.id));
};

export const getDepartmentDefaultAccount = (
  counter: Pick<Counter, 'linkedAccountIds' | 'linkedAccountId' | 'defaultAccountId'> | null | undefined,
  accounts: Account[],
) => {
  const defaultAccountId = getDepartmentDefaultAccountId(counter);
  return defaultAccountId ? accounts.find((account) => account.id === defaultAccountId) : undefined;
};

export const getServicesForDepartment = (
  services: Service[],
  departmentId?: string | null,
) => {
  if (!departmentId) {
    return [];
  }

  return services.filter((service) => service.departmentId === departmentId);
};

export const createEmptyBusinessWorkspace = (): BusinessWorkspace => ({
  customers: [],
  employees: [],
  transactions: [],
  notifications: [],
  counters: [],
  accounts: [],
  services: [],
  expenses: [],
  historyEvents: [],
  reports: [],
});

export const createBusinessWorkspaceFromPermissions = (permissions: CustomerPermissions): BusinessWorkspace => {
  normalizeCustomerPermissions(permissions);
  return createEmptyBusinessWorkspace();
};

export const getBusinessWorkspace = (state: AppState, businessId?: string) => {
  if (!businessId) {
    return createEmptyBusinessWorkspace();
  }

  const business = state.businesses.find((item) => item.id === businessId);
  if (!business) {
    return createEmptyBusinessWorkspace();
  }

  return state.businessWorkspacesById[businessId] ?? createBusinessWorkspaceFromPermissions(business.permissions);
};

export const aggregateBusinessWorkspaces = (workspaces: BusinessWorkspace[]): BusinessWorkspace => ({
  customers: workspaces.flatMap((workspace) => workspace.customers),
  employees: workspaces.flatMap((workspace) => workspace.employees),
  transactions: workspaces.flatMap((workspace) => workspace.transactions),
  notifications: workspaces.flatMap((workspace) => workspace.notifications),
  counters: workspaces.flatMap((workspace) => workspace.counters),
  accounts: workspaces.flatMap((workspace) => workspace.accounts),
  services: workspaces.flatMap((workspace) => workspace.services),
  expenses: workspaces.flatMap((workspace) => workspace.expenses),
  historyEvents: workspaces.flatMap((workspace) => workspace.historyEvents),
  reports: workspaces.flatMap((workspace) => workspace.reports),
});

const initialBusinesses: Business[] = [];

const initialAdminWorkspace: AdminWorkspace = {
  notifications: [],
  historyEvents: [],
  reports: [],
  additionOptions: [],
};

const buildInitialState = (): AppState => ({
  businesses: initialBusinesses,
  businessWorkspacesById: Object.fromEntries(
    initialBusinesses.map((business) => [
      business.id,
      createBusinessWorkspaceFromPermissions(business.permissions),
    ])
  ),
  adminWorkspace: initialAdminWorkspace,
});

export const getInitialAppState = (): AppState => buildInitialState();

const initialState: AppState = buildInitialState();

export const APP_STATE_STORAGE_KEY = 'enest-app-state-v2';
const LEGACY_APP_STATE_STORAGE_KEY = 'enest-app-state-v1';

type BusinessNormalizationInput =
  Omit<Business, 'permissions' | 'password' | 'email' | 'onboardingCompleted' | 'onboardingStep' | 'statusReason' | 'subscription'> &
  Partial<Pick<Business, 'permissions' | 'password' | 'email' | 'onboardingCompleted' | 'onboardingStep' | 'statusReason' | 'subscription'>>;

const normalizeBusiness = (
  business: BusinessNormalizationInput,
): Business => {
  const joinedDate = business.joinedDate || today();
  const accessState = getBusinessAccessState({
    status: business.status || 'Active',
    statusReason: business.statusReason,
    joinedDate,
    subscription: business.subscription,
  });

  return {
    ...business,
    email: business.email?.trim().toLowerCase() ?? '',
    password: business.password ?? '',
    permissions: normalizeCustomerPermissions(business.permissions ?? buildDefaultCustomerPermissions()),
    status: accessState.status,
    statusReason: accessState.reason,
    joinedDate,
    onboardingCompleted: business.onboardingCompleted ?? false,
    onboardingStep: business.onboardingCompleted ? 'dashboard' : business.onboardingStep || 'welcome',
    subscription: toStoredBusinessSubscription(accessState.subscription),
  };
};

const normalizeBusinessCustomer = (customer: Partial<BusinessCustomer> & Pick<BusinessCustomer, 'id' | 'name' | 'phone'>): BusinessCustomer => ({
  id: customer.id,
  name: customer.name,
  phone: customer.phone,
  email: customer.email ?? '',
  status: customer.status || 'Active',
  joinedDate: customer.joinedDate || today(),
});

const normalizeEmployee = (
  employee: Omit<Employee, 'email' | 'password' | 'permissions'> & {
    email?: string;
    password?: string;
    permissions?: CustomerPermissions;
  },
  fallbackPermissions?: CustomerPermissions,
): Employee => ({
  ...employee,
  email: employee.email?.trim().toLowerCase() ?? '',
  password: employee.password ?? '',
  permissions: normalizeCustomerPermissions(employee.permissions ?? fallbackPermissions ?? buildDefaultCustomerPermissions()),
  departmentId: employee.departmentId || undefined,
  status: employee.status || 'Active',
  joinedDate: employee.joinedDate || today(),
});

const normalizeCounter = (counter: Counter): Counter => ({
  ...counter,
  linkedAccountIds: getDepartmentLinkedAccountIds(counter),
  defaultAccountId: getDepartmentDefaultAccountId(counter),
  linkedAccountId: getDepartmentDefaultAccountId(counter),
  status: counter.status || 'Active',
});

const normalizeAccount = (account: Account): Account => ({
  ...account,
  status: account.status || 'Active',
  date: account.date || today(),
});

const normalizeTransactionStatus = (status?: string): Transaction['status'] => {
  if (status === 'pending' || status === 'completed' || status === 'cancelled' || status === 'refunded') {
    return status;
  }

  if (status === 'failed') {
    return 'cancelled';
  }

  return 'completed';
};

const normalizeTransactionPaymentDetails = (
  paymentMode: Transaction['paymentMode'],
  paymentDetails?: Transaction['paymentDetails'],
): Transaction['paymentDetails'] => {
  if (paymentMode === 'cash' || !paymentDetails) {
    return undefined;
  }

  if (paymentMode === 'upi' && paymentDetails.kind === 'upi') {
    return {
      kind: 'upi',
      transactionId: paymentDetails.transactionId.trim(),
      utrNumber: paymentDetails.utrNumber.trim(),
    };
  }

  if (paymentMode === 'card' && paymentDetails.kind === 'card') {
    return {
      kind: 'card',
      transactionId: paymentDetails.transactionId.trim(),
      cardType: paymentDetails.cardType.trim(),
      cardNetwork: paymentDetails.cardNetwork.trim(),
      lastFourDigits: paymentDetails.lastFourDigits.trim(),
    };
  }

  if (paymentMode === 'bank' && paymentDetails.kind === 'bank') {
    return {
      kind: 'bank',
      bankTransferType: paymentDetails.bankTransferType.trim(),
      bankTransactionReferenceNumber: paymentDetails.bankTransactionReferenceNumber.trim(),
      senderAccountHolderName: paymentDetails.senderAccountHolderName.trim(),
      senderBankName: paymentDetails.senderBankName.trim(),
      senderAccountNumber: paymentDetails.senderAccountNumber.trim(),
    };
  }

  return undefined;
};

const normalizeTransaction = (
  transaction: Partial<Transaction> & Pick<Transaction, 'id' | 'customerId' | 'customerName' | 'service'>
): Transaction => {
  const status = normalizeTransactionStatus(transaction.status);
  const paymentMode = transaction.paymentMode || 'cash';
  const legacyAmount = typeof transaction.totalAmount === 'number'
    ? transaction.totalAmount
    : typeof (transaction as Partial<{ amount: number }>).amount === 'number'
      ? (transaction as Partial<{ amount: number }>).amount || 0
      : 0;
  const paidAmount = typeof transaction.paidAmount === 'number'
    ? transaction.paidAmount
    : status === 'pending'
      ? 0
      : legacyAmount;
  const dueAmount = typeof transaction.dueAmount === 'number'
    ? transaction.dueAmount
    : deriveTransactionStatus(status, legacyAmount, paidAmount).dueAmount;
  const isDeleted = Boolean(transaction.isDeleted);
  const createdAt = transaction.createdAt || nowIso();
  const normalizeOptionalText = (value?: string) => value?.trim() || undefined;
  const lastAuditAction = (() => {
    if (transaction.lastAuditAction) {
      return transaction.lastAuditAction;
    }

    if (isDeleted) {
      return 'deleted' as const;
    }

    if (status === 'refunded') {
      return 'refunded' as const;
    }

    if (status === 'cancelled') {
      return 'cancelled' as const;
    }

    if (transaction.updatedAt || transaction.updatedBy) {
      return 'updated' as const;
    }

    return 'created' as const;
  })();

  return {
    id: transaction.id,
    transactionNumber: transaction.transactionNumber || createTransactionNumber(),
    customerId: transaction.customerId,
    customerName: transaction.customerName,
    customerPhone: transaction.customerPhone || '',
    serviceId: transaction.serviceId || '',
    service: transaction.service,
    servicePrice: typeof transaction.servicePrice === 'number' ? transaction.servicePrice : legacyAmount,
    totalAmount: legacyAmount,
    paidAmount,
    dueAmount,
    paymentMode,
    paymentDetails: normalizeTransactionPaymentDetails(paymentMode, transaction.paymentDetails),
    departmentId: transaction.departmentId || undefined,
    departmentName: transaction.departmentName || '',
    accountId: transaction.accountId || undefined,
    accountLabel: transaction.accountLabel || '',
    handledById: transaction.handledById || '',
    handledByName: transaction.handledByName || '',
    handledByRole: transaction.handledByRole === 'Employee' ? 'Employee' : 'Customer',
    note: transaction.note || '',
    status,
    date: transaction.date || today(),
    createdAt,
    createdBy: normalizeOptionalText(transaction.createdBy) || normalizeOptionalText(transaction.handledByName),
    updatedAt: normalizeOptionalText(transaction.updatedAt),
    updatedBy: normalizeOptionalText(transaction.updatedBy),
    cancelledAt: normalizeOptionalText(transaction.cancelledAt),
    cancelledBy: normalizeOptionalText(transaction.cancelledBy),
    refundedAt: normalizeOptionalText(transaction.refundedAt),
    refundedBy: normalizeOptionalText(transaction.refundedBy),
    refundReason: normalizeOptionalText(transaction.refundReason),
    deletedAt: normalizeOptionalText(transaction.deletedAt),
    deletedBy: normalizeOptionalText(transaction.deletedBy),
    deleteReason: normalizeOptionalText(transaction.deleteReason),
    lastAuditAction,
    isDeleted,
  };
};

const normalizeService = (
  service: Partial<Service> & Pick<Service, 'id' | 'name'>,
  counters: Counter[],
): Service => {
  const fallbackDepartment = counters.find((counter) => counter.status !== 'Inactive') || counters[0];
  const matchedDepartment = counters.find((counter) => counter.id === service.departmentId);
  const resolvedDepartment = matchedDepartment || fallbackDepartment;

  return {
    id: service.id,
    departmentId: resolvedDepartment?.id,
    departmentName: resolvedDepartment?.name || service.departmentName || 'Unassigned Department',
    name: service.name || 'Untitled Service',
    category: service.category || 'General',
    price: typeof service.price === 'number' ? service.price : 0,
    status: service.status === 'Inactive' ? 'Inactive' : 'Active',
    description: service.description || '',
  };
};

const createRecentServiceFromTransaction = (transaction: Transaction): RecentService => ({
  id: transaction.id,
  name: transaction.service,
  customer: transaction.customerName,
  amount: transaction.totalAmount,
  status:
    transaction.status === 'completed'
      ? 'Completed'
      : transaction.status === 'pending'
        ? 'Pending'
        : transaction.status === 'refunded'
          ? 'Refunded'
          : 'Cancelled',
});

export const getRecentServicesFromTransactions = (
  transactions: Transaction[],
  limit = 8,
): RecentService[] =>
  transactions
    .filter((transaction) => !transaction.isDeleted)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(createRecentServiceFromTransaction);

const applyBalanceDeltas = <
  TRecord extends Account | Counter,
>(records: TRecord[], deltas: BalanceDelta[]): TRecord[] => {
  if (deltas.length === 0) {
    return records;
  }

  const deltaByRecordId = new Map(deltas.map((delta) => [delta.recordId, delta.delta]));

  return records.map((record) =>
    deltaByRecordId.has(record.id)
      ? ({
          ...record,
          currentBalance: record.currentBalance + (deltaByRecordId.get(record.id) || 0),
        } as TRecord)
      : record
  );
};

const normalizeWorkspace = (
  workspace: Partial<BusinessWorkspace> | undefined,
  permissions: CustomerPermissions
): BusinessWorkspace => {
  const baseWorkspace = createBusinessWorkspaceFromPermissions(normalizeCustomerPermissions(permissions));
  const normalizedCounters = (workspace?.counters ?? baseWorkspace.counters).map((counter) =>
    normalizeCounter(counter as Counter)
  );
  const normalizedWorkspace: BusinessWorkspace = {
    ...baseWorkspace,
    ...workspace,
    customers: (workspace?.customers ?? baseWorkspace.customers).map((customer) =>
      normalizeBusinessCustomer(customer as Partial<BusinessCustomer> & Pick<BusinessCustomer, 'id' | 'name' | 'phone'>)
    ),
    employees: (workspace?.employees ?? baseWorkspace.employees).map((employee) =>
      normalizeEmployee(
        employee as Omit<Employee, 'email' | 'password' | 'permissions'> & {
          email?: string;
          password?: string;
          permissions?: CustomerPermissions;
        },
        permissions,
      )
    ),
    transactions: (workspace?.transactions ?? baseWorkspace.transactions).map((transaction) =>
      normalizeTransaction(transaction as Partial<Transaction> & Pick<Transaction, 'id' | 'customerId' | 'customerName' | 'service'>)
    ),
    notifications: workspace?.notifications ?? baseWorkspace.notifications,
    counters: normalizedCounters,
    accounts: (workspace?.accounts ?? baseWorkspace.accounts).map((account) =>
      normalizeAccount(account as Account)
    ),
    services: (workspace?.services ?? baseWorkspace.services).map((service) =>
      normalizeService(service as Partial<Service> & Pick<Service, 'id' | 'name'>, normalizedCounters)
    ),
    expenses: workspace?.expenses ?? baseWorkspace.expenses,
    historyEvents: workspace?.historyEvents ?? baseWorkspace.historyEvents,
    reports: workspace?.reports ?? baseWorkspace.reports,
  };

  return normalizedWorkspace;
};

const normalizeAdminWorkspace = (workspace?: Partial<AdminWorkspace>): AdminWorkspace => ({
  notifications: workspace?.notifications ?? initialAdminWorkspace.notifications,
  historyEvents: workspace?.historyEvents ?? initialAdminWorkspace.historyEvents,
  reports: workspace?.reports ?? initialAdminWorkspace.reports,
  additionOptions: workspace?.additionOptions ?? initialAdminWorkspace.additionOptions,
});

interface LegacyCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: 'Active' | 'Inactive';
  joinedDate?: string;
  permissions?: CustomerPermissions;
}

export interface LegacyAppState {
  customers?: LegacyCustomer[];
  notifications?: Notification[];
  historyEvents?: HistoryEvent[];
  reports?: ReportItem[];
  additionOptions?: AdditionOption[];
}

export const migrateLegacyState = (legacyState: LegacyAppState): AppState => {
  const migratedBusinesses = (legacyState.customers ?? []).map((customer) =>
    normalizeBusiness({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      password: '',
      status: customer.status,
      joinedDate: customer.joinedDate,
      permissions: customer.permissions,
    })
  );

  const fallbackBusinesses = migratedBusinesses;

  return {
    businesses: fallbackBusinesses,
    businessWorkspacesById: Object.fromEntries(
      fallbackBusinesses.map((business) => [
        business.id,
        createBusinessWorkspaceFromPermissions(business.permissions),
      ])
    ),
    adminWorkspace: normalizeAdminWorkspace({
      notifications: legacyState.notifications,
      historyEvents: legacyState.historyEvents,
      reports: legacyState.reports,
      additionOptions: legacyState.additionOptions,
    }),
  };
};

const loadPersistedState = (): AppState => {
  try {
    const storedState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);

    if (storedState) {
      const parsedState = JSON.parse(storedState) as Partial<AppState>;
      const businesses = (parsedState.businesses ?? initialState.businesses).map((business) =>
        normalizeBusiness(
          business as BusinessNormalizationInput
        )
      );

      return {
        businesses,
        businessWorkspacesById: Object.fromEntries(
          businesses.map((business) => [
            business.id,
            normalizeWorkspace(parsedState.businessWorkspacesById?.[business.id], business.permissions),
          ])
        ),
        adminWorkspace: normalizeAdminWorkspace(parsedState.adminWorkspace),
      };
    }

    const legacyState = window.localStorage.getItem(LEGACY_APP_STATE_STORAGE_KEY);
    if (legacyState) {
      return migrateLegacyState(JSON.parse(legacyState) as LegacyAppState);
    }

    return initialState;
  } catch {
    return initialState;
  }
};

const withBusinessWorkspace = (
  state: AppState,
  businessId: string,
  updater: (workspace: BusinessWorkspace) => BusinessWorkspace
) => {
  const business = state.businesses.find((item) => item.id === businessId);
  if (!business) return state;

  const currentWorkspace = state.businessWorkspacesById[businessId] ?? createBusinessWorkspaceFromPermissions(business.permissions);
  const nextWorkspace = updater(currentWorkspace);

  return {
    ...state,
    businessWorkspacesById: {
      ...state.businessWorkspacesById,
      [businessId]: nextWorkspace,
    },
  };
};

const withAdminWorkspace = (
  state: AppState,
  updater: (workspace: AdminWorkspace) => AdminWorkspace
) => ({
  ...state,
  adminWorkspace: updater(state.adminWorkspace),
});

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_BUSINESS': {
      const newBusiness = normalizeBusiness({
        ...action.payload,
        id: createRecordId(),
      });

      return {
        ...state,
        businesses: [...state.businesses, newBusiness],
        businessWorkspacesById: {
          ...state.businessWorkspacesById,
          [newBusiness.id]: createBusinessWorkspaceFromPermissions(newBusiness.permissions),
        },
      };
    }
    case 'UPDATE_BUSINESS': {
      const updatedBusiness = normalizeBusiness(action.payload);
      const existingWorkspace = state.businessWorkspacesById[updatedBusiness.id];

      return {
        ...state,
        businesses: state.businesses.map((business) =>
          business.id === updatedBusiness.id ? updatedBusiness : business
        ),
        businessWorkspacesById: {
          ...state.businessWorkspacesById,
          [updatedBusiness.id]: normalizeWorkspace(existingWorkspace, updatedBusiness.permissions),
        },
      };
    }
    case 'DELETE_BUSINESS': {
      const nextWorkspaces = { ...state.businessWorkspacesById };
      delete nextWorkspaces[action.payload];

      return {
        ...state,
        businesses: state.businesses.filter((business) => business.id !== action.payload),
        businessWorkspacesById: nextWorkspaces,
      };
    }
    case 'ADD_TRANSACTION':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const newTransaction = normalizeTransaction({
          ...action.payload,
          id: createRecordId(),
          transactionNumber: createTransactionNumber(),
          date: today(),
          createdAt: nowIso(),
          createdBy: action.payload.createdBy || action.payload.handledByName,
          lastAuditAction: 'created',
          isDeleted: false,
        });
        const balanceDelta = getTransactionUpdateDelta(undefined, newTransaction);

        return {
          ...workspace,
          accounts: applyBalanceDeltas(workspace.accounts, balanceDelta.accountDeltas),
          counters: applyBalanceDeltas(workspace.counters, balanceDelta.departmentDeltas),
          transactions: [newTransaction, ...workspace.transactions],
        };
      });
    case 'UPDATE_TRANSACTION':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const previousTransaction = workspace.transactions.find((transaction) => transaction.id === action.payload.id);
        if (!previousTransaction) {
          return workspace;
        }

        const normalizedTransaction = normalizeTransaction(action.payload);
        const balanceDelta = getTransactionUpdateDelta(previousTransaction, normalizedTransaction);

        return {
          ...workspace,
          accounts: applyBalanceDeltas(workspace.accounts, balanceDelta.accountDeltas),
          counters: applyBalanceDeltas(workspace.counters, balanceDelta.departmentDeltas),
          transactions: workspace.transactions.map((transaction) =>
            transaction.id === normalizedTransaction.id ? normalizedTransaction : transaction
          ),
        };
      });
    case 'ADD_CUSTOMER':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const newCustomer = normalizeBusinessCustomer({
          ...action.payload,
          id: action.payload.id || createRecordId(),
        });

        return {
          ...workspace,
          customers: [...workspace.customers, newCustomer],
        };
      });
    case 'UPDATE_CUSTOMER':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        customers: workspace.customers.map((customer) =>
          customer.id === action.payload.id ? normalizeBusinessCustomer(action.payload) : customer
        ),
      }));
    case 'ADD_EMPLOYEE':
      {
        const businessPermissions = state.businesses.find((business) => business.id === action.businessId)?.permissions;

      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const newEmployee = normalizeEmployee({
          ...action.payload,
          id: createRecordId(),
        }, businessPermissions);

        return {
          ...workspace,
          employees: [newEmployee, ...workspace.employees],
        };
      });
      }
    case 'UPDATE_EMPLOYEE':
      {
        const businessPermissions = state.businesses.find((business) => business.id === action.businessId)?.permissions;

      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        employees: workspace.employees.map((employee) =>
          employee.id === action.payload.id ? normalizeEmployee(action.payload, businessPermissions) : employee
        ),
      }));
      }
    case 'ADD_COUNTER':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const newCounter = normalizeCounter({
          ...action.payload,
          id: createRecordId(),
        });

        return {
          ...workspace,
          counters: [newCounter, ...workspace.counters],
        };
      });
    case 'UPDATE_COUNTER':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        counters: workspace.counters.map((counter) =>
          counter.id === action.payload.id ? normalizeCounter(action.payload) : counter
        ),
      }));
    case 'ADD_ACCOUNT':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const newAccount: Account = {
          ...action.payload,
          id: action.payload.id || createRecordId(),
          date: today(),
        };

        return {
          ...workspace,
          accounts: [newAccount, ...workspace.accounts],
        };
      });
    case 'UPDATE_ACCOUNT':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        accounts: workspace.accounts.map((account) =>
          account.id === action.payload.id ? action.payload : account
        ),
      }));
    case 'ADD_SERVICE':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const newService: Service = {
          ...action.payload,
          id: action.payload.id || createRecordId(),
        };

        return {
          ...workspace,
          services: [newService, ...workspace.services],
        };
      });
    case 'UPDATE_SERVICE':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        services: workspace.services.map((service) =>
          service.id === action.payload.id ? action.payload : service
        ),
      }));
    case 'ADD_EXPENSE':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const newExpense: Expense = {
          ...action.payload,
          id: createRecordId(),
        };

        return {
          ...workspace,
          expenses: [newExpense, ...workspace.expenses],
        };
      });
    case 'UPDATE_EXPENSE':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        expenses: workspace.expenses.map((expense) =>
          expense.id === action.payload.id ? action.payload : expense
        ),
      }));
    case 'ADD_REPORT':
      if (action.businessId) {
        return withBusinessWorkspace(state, action.businessId, (workspace) => {
          const newReport: ReportItem = {
            ...action.payload,
            id: createRecordId(),
            date: today(),
          };

          return {
            ...workspace,
            reports: [newReport, ...workspace.reports],
          };
        });
      }

      return withAdminWorkspace(state, (workspace) => {
        const newReport: ReportItem = {
          ...action.payload,
          id: createRecordId(),
          date: today(),
        };

        return {
          ...workspace,
          reports: [newReport, ...workspace.reports],
        };
      });
    case 'ADD_HISTORY_EVENT':
      if (action.businessId) {
        return withBusinessWorkspace(state, action.businessId, (workspace) => {
          const newHistoryEvent: HistoryEvent = {
            ...action.payload,
            id: createRecordId(),
            date: today(),
          };

          return {
            ...workspace,
            historyEvents: [newHistoryEvent, ...workspace.historyEvents],
          };
        });
      }

      return withAdminWorkspace(state, (workspace) => {
        const newHistoryEvent: HistoryEvent = {
          ...action.payload,
          id: createRecordId(),
          date: today(),
        };

        return {
          ...workspace,
          historyEvents: [newHistoryEvent, ...workspace.historyEvents],
        };
      });
    case 'ADD_NOTIFICATION':
      if (action.businessId) {
        return withBusinessWorkspace(state, action.businessId, (workspace) => {
          const newNotification: Notification = {
            ...action.payload,
            id: createRecordId(),
            timestamp: 'Just now',
          };

          return {
            ...workspace,
            notifications: [newNotification, ...workspace.notifications],
          };
        });
      }

      return withAdminWorkspace(state, (workspace) => {
        const newNotification: Notification = {
          ...action.payload,
          id: createRecordId(),
          timestamp: 'Just now',
        };

        return {
          ...workspace,
          notifications: [newNotification, ...workspace.notifications],
        };
      });
    case 'DISMISS_NOTIFICATION':
      if (action.businessId) {
        return withBusinessWorkspace(state, action.businessId, (workspace) => ({
          ...workspace,
          notifications: workspace.notifications.filter((notification) => notification.id !== action.payload),
        }));
      }

      return withAdminWorkspace(state, (workspace) => ({
        ...workspace,
        notifications: workspace.notifications.filter((notification) => notification.id !== action.payload),
      }));
    case 'DELETE_ACCOUNT':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        accounts: workspace.accounts.filter((account) => account.id !== action.payload),
        counters: workspace.counters.map((counter) =>
          normalizeCounter({
            ...counter,
            linkedAccountIds: getDepartmentLinkedAccountIds(counter).filter((accountId) => accountId !== action.payload),
            defaultAccountId: counter.defaultAccountId === action.payload
              ? getDepartmentLinkedAccountIds(counter).filter((accountId) => accountId !== action.payload)[0]
              : counter.defaultAccountId,
            linkedAccountId: counter.linkedAccountId === action.payload ? undefined : counter.linkedAccountId,
          })
        ),
      }));
    case 'DELETE_SERVICE':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        services: workspace.services.filter((service) => service.id !== action.payload),
      }));
    case 'DELETE_CUSTOMER':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        customers: workspace.customers.filter((customer) => customer.id !== action.payload),
      }));
    case 'DELETE_EMPLOYEE':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        employees: workspace.employees.filter((employee) => employee.id !== action.payload),
      }));
    case 'DELETE_COUNTER':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        counters: workspace.counters.filter((counter) => counter.id !== action.payload),
      }));
    case 'DELETE_EXPENSE':
      return withBusinessWorkspace(state, action.businessId, (workspace) => ({
        ...workspace,
        expenses: workspace.expenses.filter((expense) => expense.id !== action.payload),
      }));
    case 'DELETE_TRANSACTION':
      return withBusinessWorkspace(state, action.businessId, (workspace) => {
        const deletePayload = typeof action.payload === 'string'
          ? { id: action.payload }
          : action.payload;
        const previousTransaction = workspace.transactions.find((transaction) => transaction.id === deletePayload.id);
        if (!previousTransaction) {
          return workspace;
        }

        const now = nowIso();
        const deletedTransaction = normalizeTransaction({
          ...previousTransaction,
          deletedAt: previousTransaction.deletedAt || now,
          deletedBy: deletePayload.deletedBy || previousTransaction.deletedBy,
          deleteReason: deletePayload.deleteReason || previousTransaction.deleteReason,
          updatedAt: now,
          updatedBy: deletePayload.deletedBy || previousTransaction.updatedBy,
          lastAuditAction: 'deleted',
          isDeleted: true,
        });
        const balanceDelta = getTransactionUpdateDelta(previousTransaction, deletedTransaction);

        return {
          ...workspace,
          accounts: applyBalanceDeltas(workspace.accounts, balanceDelta.accountDeltas),
          counters: applyBalanceDeltas(workspace.counters, balanceDelta.departmentDeltas),
          transactions: workspace.transactions.map((transaction) =>
            transaction.id === deletedTransaction.id ? deletedTransaction : transaction
          ),
        };
      });
    case 'DELETE_HISTORY_EVENT':
      if (action.businessId) {
        return withBusinessWorkspace(state, action.businessId, (workspace) => ({
          ...workspace,
          historyEvents: workspace.historyEvents.filter((event) => event.id !== action.payload),
        }));
      }

      return withAdminWorkspace(state, (workspace) => ({
        ...workspace,
        historyEvents: workspace.historyEvents.filter((event) => event.id !== action.payload),
      }));
    case 'DELETE_REPORT':
      if (action.businessId) {
        return withBusinessWorkspace(state, action.businessId, (workspace) => ({
          ...workspace,
          reports: workspace.reports.filter((report) => report.id !== action.payload),
        }));
      }

      return withAdminWorkspace(state, (workspace) => ({
        ...workspace,
        reports: workspace.reports.filter((report) => report.id !== action.payload),
      }));
    case 'UPDATE_ADDITION_OPTION':
      return withAdminWorkspace(state, (workspace) => ({
        ...workspace,
        additionOptions: workspace.additionOptions.map((option) =>
          option.id === action.payload.id ? action.payload : option
        ),
      }));
    case 'DELETE_ADDITION_OPTION':
      return withAdminWorkspace(state, (workspace) => ({
        ...workspace,
        additionOptions: workspace.additionOptions.filter((option) => option.id !== action.payload),
      }));
    case 'HYDRATE_APP_STATE':
      return action.payload;
    default:
      return state;
  }
}

const toPersistedWorkspace = (workspace: BusinessWorkspace): BusinessWorkspace => ({
  ...workspace,
  notifications: [],
});

const toPersistedAdminWorkspace = (workspace: AdminWorkspace): AdminWorkspace => ({
  ...workspace,
  notifications: [],
});

const toPersistedAppState = (state: AppState): AppState => ({
  businesses: state.businesses,
  businessWorkspacesById: Object.fromEntries(
    Object.entries(state.businessWorkspacesById).map(([businessId, workspace]) => [
      businessId,
      toPersistedWorkspace(workspace),
    ])
  ),
  adminWorkspace: toPersistedAdminWorkspace(state.adminWorkspace),
});

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<React.Dispatch<AppAction> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const persistedState = loadPersistedState();
    if (persistedState !== initialState) {
      dispatch({ type: 'HYDRATE_APP_STATE', payload: persistedState });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          APP_STATE_STORAGE_KEY,
          JSON.stringify(toPersistedAppState(state))
        );
        window.localStorage.removeItem(LEGACY_APP_STATE_STORAGE_KEY);
      } catch {
        // Keep the app usable if the browser blocks local storage.
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [state]);

  return (
    <AppDispatchContext.Provider value={dispatch}>
      <AppStateContext.Provider value={state}>
        {children}
      </AppStateContext.Provider>
    </AppDispatchContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
}

export function useApp() {
  return {
    state: useAppState(),
    dispatch: useAppDispatch(),
  };
}
