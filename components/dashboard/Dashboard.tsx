'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaBell, FaBuilding, FaDollarSign, FaExclamationTriangle, FaHourglassHalf, FaUsers, FaChartLine, FaCog, FaReceipt, FaHistory, FaTools, FaFolderOpen, FaFileAlt, FaPlusCircle, FaUsersCog, FaArchive, FaUniversity, FaStar, FaFilter } from 'react-icons/fa';
import { getAvailableUsers, type SessionUser } from '../../lib/auth-session';
import { buildCsv } from '../../lib/csv';
import {
  canPerformModuleActionForSession,
  canDeleteModuleForSession,
  canManageModuleForSession,
  canViewModuleRecordsForSession,
} from '../../lib/dashboard-controller';
import {
  createRecordId,
  getDepartmentDefaultAccount,
  getDepartmentLinkedAccountIds,
  getDepartmentLinkedAccounts,
  getServicesForDepartment,
  useAppDispatch,
} from '../../lib/store';
import type { Account, AdditionOption, Business, BusinessCustomer, BusinessOnboardingStep, Counter, Employee, Expense, HistoryEvent, ReportItem, Service, Transaction } from '../../lib/store';
import { buildDailyClosingSummary, buildTransactionReceiptText } from '../../lib/transaction-workflow';
import {
  canTransitionTransactionStatus,
  validateTransactionAccountSelection,
  validateTransactionAmounts,
} from '../../lib/transaction-rules';
import {
  useAdminWorkspaceData,
  useBusinesses,
  useBusinessWorkspacesById,
  useFilteredTransactionRecords,
  useRecentServices,
  useRoleScopedWorkspace,
  useSearchResults,
  useSortedTransactionRecords,
  useTransactionFilterOptions,
  useTransactionStats,
  useVisibleCustomerRecords,
  useVisibleServiceRecords,
  useVisibleTransactionRecords,
} from '../../lib/dashboard-selectors';
import { useCustomers } from '../../lib/hooks/useCustomers';
import { useDashboardSummary } from '../../lib/hooks/useDashboardSummary';
import { useBackendBusinesses } from '../../lib/hooks/useBackendBusinesses';
import { useDepartments } from '../../lib/hooks/useDepartments';
import { useEmployees } from '../../lib/hooks/useEmployees';
import { useReports } from '../../lib/hooks/useReports';
import { useRoleTemplates } from '../../lib/hooks/useRoleTemplates';
import { useTransactions } from '../../lib/hooks/useTransactions';
import type { WorkspaceInitialData } from '../../lib/api/workspace-initial-data';
import { buildRoleTemplatePrivilegesPayload } from '../../lib/mappers/role-template-mapper';
import {
  getCustomerWorkspaceViewUi,
  getModuleLabel as getModuleUiLabel,
  getModuleUi,
} from '../../lib/module-ui';
import {
  buildDefaultCustomerPermissions,
  canAccessModuleForSession,
  getModuleDisplayById,
  getRoleLabel,
  intersectCustomerPermissions,
  isPermissionEnabled,
} from '../../lib/platform-structure';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import { type ServiceWorkflowDraft } from '../forms/ServiceForm';
import AccountForm, { type AccountFormValues } from '../forms/AccountForm';
import BusinessForm, { type BusinessFormValues } from '../forms/BusinessForm';
import CustomerForm, { type CustomerFormValues } from '../forms/CustomerForm';
import DepartmentForm, { type DepartmentFormValues } from '../forms/DepartmentForm';
import EmployeeForm, { type EmployeeFormValues } from '../forms/EmployeeForm';
import ExpenseForm, { type ExpenseFormValues } from '../forms/ExpenseForm';
import ServiceEditorForm, { type ServiceFormValues } from '../forms/ServiceEditorForm';
import SubscriptionPlanForm from '../forms/SubscriptionPlanForm';
import TransactionEditForm, { type TransactionEditorValues } from '../forms/TransactionEditForm';
import { type SummaryCardProps } from './SummaryCard';
import SummaryGrid from './SummaryGrid';
import ReusableListTable from '../common/ReusableListTable';
import type { CustomerOutstandingRow } from '../tables/CustomerOutstandingTable';
import {
  buildEmptyDataTableFiltersValue,
  readDataTableDateRangeFilter,
  readDataTableMultiSelectFilter,
  readDataTableSingleSelectFilter,
  type DataTableFiltersConfig,
  type DataTableFiltersValue,
} from '../common/DataTableFilters';
import DataTableFilters from '../common/DataTableFilters';
import SubscriptionTransactionsTable from '../tables/SubscriptionTransactionsTable';
import ActionModal from '../ui/ActionModal';
import DetailList from '../ui/DetailList';
import ConfirmActionModal from '../ui/state/ConfirmActionModal';
import EmptyState from '../ui/state/EmptyState';
import ErrorState from '../ui/state/ErrorState';
import LoadingState from '../ui/state/LoadingState';
import PermissionState from '../ui/state/PermissionState';
import NotificationCenter from './NotificationCenter';
import BusinessOnboarding from './BusinessOnboarding';
import type { DashboardTabContext } from './active-tab/types';
import Footer from '../layout/Footer';
import { DashboardTabContextProvider } from './DashboardTabContext';
import {
  businessSubscriptionPlans,
  getBusinessAccessState,
  getBusinessSubscriptionPlan,
  type BusinessSubscription,
} from '../../lib/subscription';
import { getCustomerWorkspacePath, type CustomerWorkspaceView } from '../../lib/workspace-routes';

const getSubscriptionStatusLabel = (status?: BusinessSubscription['status']) => {
  if (status === 'trial') return 'Trial';
  if (status === 'expired') return 'Expired';
  if (status === 'cancelled') return 'Cancelled';
  return 'Active';
};

const getSubscriptionStatusClass = (status?: BusinessSubscription['status']) => {
  if (status === 'trial') return 'status-chip status-chip--info';
  if (status === 'expired') return 'status-chip status-chip--failed';
  if (status === 'cancelled') return 'status-chip status-chip--inactive';
  return 'status-chip status-chip--active';
};

const getNextOnboardingStep = (
  currentStep: Exclude<BusinessOnboardingStep, 'dashboard'>,
  canAccessServicesStep: boolean,
): BusinessOnboardingStep => {
  switch (currentStep) {
    case 'welcome':
      return 'departments';
    case 'departments':
      return 'accounts';
    case 'accounts':
      return canAccessServicesStep ? 'services' : 'customers';
    case 'services':
      return 'customers';
    case 'customers':
      return 'dashboard';
    default:
      return 'dashboard';
  }
};

const mergeWorkspaceRecords = <T extends { id: string }>(workspaceRecords: T[], apiRecords: T[]) => {
  if (apiRecords.length === 0) {
    return workspaceRecords;
  }

  const workspaceRecordById = new Map(workspaceRecords.map((record) => [record.id, record]));
  const mergedRecords = apiRecords.map((apiRecord) => {
    const localRecord = workspaceRecordById.get(apiRecord.id);

    return localRecord
      ? {
          ...localRecord,
          ...apiRecord,
        }
      : apiRecord;
  });

  const apiRecordIds = new Set(apiRecords.map((record) => record.id));
  const remainingWorkspaceRecords = workspaceRecords.filter((record) => !apiRecordIds.has(record.id));

  return [...mergedRecords, ...remainingWorkspaceRecords];
};

type ModalMode =
  | 'notifications'
  | 'favorites'
  | 'add-service'
  | 'edit-service'
  | 'add-customer'
  | 'edit-customer'
  | 'add-employee'
  | 'edit-employee'
  | 'add-department'
  | 'edit-department'
  | 'add-account'
  | 'edit-account'
  | 'add-expense'
  | 'edit-expense'
  | 'edit-transaction'
  | 'view-transaction'
  | 'view-customer-history'
  | 'view-history'
  | 'view-report'
  | 'manage-plan'
  | 'configure-option'
  | 'manage-options'
  | 'confirm-delete'
  | 'confirm-plan-cancel'
  | 'confirm-option-change'
  | null;

type DeleteActionType =
  | 'DELETE_BUSINESS'
  | 'DELETE_ACCOUNT'
  | 'DELETE_SERVICE'
  | 'DELETE_CUSTOMER'
  | 'DELETE_EMPLOYEE'
  | 'DELETE_COUNTER'
  | 'DELETE_EXPENSE'
  | 'DELETE_TRANSACTION'
  | 'DELETE_HISTORY_EVENT'
  | 'DELETE_REPORT'
  | 'DELETE_ADDITION_OPTION';

const deleteActionModuleIds: Record<DeleteActionType, string> = {
  DELETE_BUSINESS: 'customers',
  DELETE_ACCOUNT: 'accounts',
  DELETE_SERVICE: 'services',
  DELETE_CUSTOMER: 'customers',
  DELETE_EMPLOYEE: 'employee',
  DELETE_COUNTER: 'departments',
  DELETE_EXPENSE: 'expense',
  DELETE_TRANSACTION: 'transactions',
  DELETE_HISTORY_EVENT: 'history',
  DELETE_REPORT: 'reports',
  DELETE_ADDITION_OPTION: 'additions',
};

type HistoryStatusFilter = 'All' | 'Failed';
type TransactionStatusFilter = 'All' | Transaction['status'];
type TransactionPaymentModeFilter = 'All' | Transaction['paymentMode'];
type DepartmentAccountStatusFilter = 'All' | 'Active' | 'Inactive' | 'Unassigned';
type AdminPlanWorkspaceFilter = 'All' | 'Active' | 'Locked';
type AdminPlanExpiryFilter = 'All' | 'Expiring Soon' | 'Expired' | 'Cancelled';

interface PendingDelete {
  actionType: DeleteActionType;
  id: string;
  label: string;
  module: string;
}

interface TransactionFilterState {
  query: string;
  status: TransactionStatusFilter;
  paymentMode: TransactionPaymentModeFilter;
  department: string;
  handler: string;
  dateFrom: string;
  dateTo: string;
  isOpen: boolean;
}

interface DepartmentFilterState {
  searchInput: string;
  searchQuery: string;
  accountStatus: DepartmentAccountStatusFilter;
}

interface AdminPlanFilterState {
  searchQuery: string;
  planId: string;
  status: 'All' | BusinessSubscription['status'];
  workspace: AdminPlanWorkspaceFilter;
  expiry: AdminPlanExpiryFilter;
  isOpen: boolean;
}

interface DashboardFilterState {
  historyStatus: HistoryStatusFilter;
  businessDirectory: DataTableFiltersValue;
  transaction: DataTableFiltersValue;
  department: DepartmentFilterState;
  adminPlan: DataTableFiltersValue;
}

interface DashboardUiState {
  activeModal: ModalMode;
  editingService: Service | null;
  editingBusiness: Business | null;
  selectedPlanBusiness: Business | null;
  editingCustomer: BusinessCustomer | null;
  editingEmployee: Employee | null;
  editingDepartment: Counter | null;
  editingAccount: Account | null;
  editingExpense: Expense | null;
  editingTransaction: Transaction | null;
  selectedTransaction: Transaction | null;
  selectedCustomerHistory: BusinessCustomer | null;
  selectedHistoryEvent: HistoryEvent | null;
  selectedReport: ReportItem | null;
  selectedOption: AdditionOption | null;
  pendingDelete: PendingDelete | null;
  transactionDeleteReason: string;
  workflowDraft: ServiceWorkflowDraft | null;
  favoriteServiceIds: string[];
}

interface DashboardProps {
  currentUser: SessionUser;
  initialWorkspaceData?: WorkspaceInitialData;
  onLogout: () => void;
  onSessionUserChange: (user: SessionUser) => void;
  activeTab: string;
  customerPageView: CustomerWorkspaceView;
  onNavigate: (moduleId: string) => void;
  children: React.ReactNode;
}

const resolveStateValue = <T,>(current: T, value: T | ((previous: T) => T)) => (
  typeof value === 'function'
    ? (value as (previous: T) => T)(current)
    : value
);

const initialTransactionFilterState: DataTableFiltersValue = {
  search: '',
  fields: {
    status: '',
    paymentMode: '',
    department: '',
    handler: '',
    date: { from: '', to: '' },
  },
};

const initialDepartmentFilterState: DepartmentFilterState = {
  searchInput: '',
  searchQuery: '',
  accountStatus: 'All',
};

const initialAdminPlanFilterState: DataTableFiltersValue = {
  search: '',
  fields: {
    planId: '',
    status: '',
    workspace: '',
    expiry: '',
  },
};

const initialBusinessDirectoryFilterState: DataTableFiltersValue = {
  search: '',
  fields: {
    permissions: [],
    status: '',
    joinedDate: { from: '', to: '' },
  },
};

const initialDashboardFilterState: DashboardFilterState = {
  historyStatus: 'All',
  businessDirectory: initialBusinessDirectoryFilterState,
  transaction: initialTransactionFilterState,
  department: initialDepartmentFilterState,
  adminPlan: initialAdminPlanFilterState,
};

const emptyTransactionRecords: Transaction[] = [];

const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  initialWorkspaceData,
  onLogout,
  onSessionUserChange,
  activeTab,
  customerPageView,
  onNavigate,
  children,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const dispatch = useAppDispatch();
  const currentRole = currentUser.role;
  const storedBusinesses = useBusinesses();
  // Admin customer management is the platform business-user directory. The
  // backend remains the source of truth so pagination and role filtering stay
  // aligned with the server response instead of local placeholder data.
  const shouldLoadAdminBusinessDirectory = currentRole === 'Admin' && activeTab === 'customers';
  const {
    businesses: backendBusinesses,
    pagination: backendBusinessPagination,
    isLoading: isBackendBusinessesLoading,
    error: backendBusinessesError,
    setPage: setBackendBusinessPage,
    reload: reloadBackendBusinesses,
  } = useBackendBusinesses(
    shouldLoadAdminBusinessDirectory,
    initialWorkspaceData?.businesses,
    10,
  );
  const businesses = useMemo(
    () => currentRole === 'Admin'
      ? backendBusinesses
      : currentRole === 'Customer'
        ? mergeWorkspaceRecords(storedBusinesses, initialWorkspaceData?.businesses ?? [])
      : storedBusinesses,
    [backendBusinesses, currentRole, initialWorkspaceData?.businesses, storedBusinesses],
  );
  const currentBusiness = useMemo(() => {
    if (!currentUser.businessId) {
      return null;
    }

    const matchedBusiness = businesses.find((business) => business.id === currentUser.businessId);
    if (matchedBusiness) {
      if (currentRole === 'Customer' && currentUser.permissions) {
        return {
          ...matchedBusiness,
          permissions: currentUser.permissions,
        };
      }

      return matchedBusiness;
    }

    if (currentRole !== 'Customer') {
      return null;
    }

    return {
      id: currentUser.businessId,
      name: currentUser.name,
      phone: 'Not added',
      email: currentUser.email,
      password: '',
      status: 'Active' as const,
      onboardingCompleted: true,
      onboardingStep: 'dashboard' as const,
      permissions: currentUser.permissions ?? buildDefaultCustomerPermissions(),
    };
  }, [businesses, currentRole, currentUser.businessId, currentUser.email, currentUser.name, currentUser.permissions]);
  const workspace = useRoleScopedWorkspace(currentRole, currentUser.businessId);
  const shouldLoadWorkspaceApi = currentRole !== 'Admin' && Boolean(currentUser.businessId);
  const initialWorkspaceApiData = currentRole === 'Admin' ? undefined : initialWorkspaceData;
  const {
    counters: apiCounters,
    isLoading: isDepartmentsLoading,
    error: departmentsError,
    reload: reloadDepartments,
  } = useDepartments(
    shouldLoadWorkspaceApi,
    initialWorkspaceApiData?.counters,
    initialWorkspaceApiData?.prefetchedCounters === true,
  );
  const {
    customers: apiCustomers,
    isLoading: isCustomersLoading,
    error: customersError,
    reload: reloadCustomers,
  } = useCustomers(shouldLoadWorkspaceApi, initialWorkspaceApiData?.customers);
  const {
    employees: apiEmployees,
    isLoading: isEmployeesLoading,
    error: employeesError,
    reload: reloadEmployees,
  } = useEmployees(shouldLoadWorkspaceApi, initialWorkspaceApiData?.employees);
  const {
    transactions: apiTransactions,
    isLoading: isTransactionsLoading,
    error: transactionsError,
    reload: reloadTransactions,
  } = useTransactions(shouldLoadWorkspaceApi, initialWorkspaceApiData?.transactions);
  const {
    reports: apiReports,
    isLoading: isReportsLoading,
    error: reportsError,
    reload: reloadReports,
  } = useReports(shouldLoadWorkspaceApi, initialWorkspaceApiData?.reports);
  const {
    summary: apiDashboardSummary,
  } = useDashboardSummary(shouldLoadWorkspaceApi, initialWorkspaceApiData?.dashboardSummary);
  const {
    roles: roleTemplates,
    isLoading: isRoleTemplatesLoading,
    error: roleTemplatesError,
    reload: reloadRoleTemplates,
  } = useRoleTemplates(currentRole === 'Admin');
  const adminWorkspace = useAdminWorkspaceData();
  const businessWorkspacesById = useBusinessWorkspacesById();
  const accounts = workspace.accounts;
  const services = workspace.services;
  const counters = useMemo(
    () => mergeWorkspaceRecords(workspace.counters, apiCounters),
    [apiCounters, workspace.counters],
  );
  const customers: Array<Business | BusinessCustomer> = useMemo(
    () => currentRole === 'Admin'
      ? businesses
      : mergeWorkspaceRecords(workspace.customers, apiCustomers),
    [apiCustomers, businesses, currentRole, workspace.customers],
  );
  const employees = useMemo(
    () => mergeWorkspaceRecords(workspace.employees, apiEmployees),
    [apiEmployees, workspace.employees],
  );
  const expenses = workspace.expenses;
  const transactionHistory = useMemo(
    () => mergeWorkspaceRecords(workspace.transactions, apiTransactions)
      .filter((transaction) => !transaction.isDeleted),
    [apiTransactions, workspace.transactions],
  );
  const recentServices = useRecentServices(transactionHistory);
  const baseNotifications = currentRole === 'Admin' ? adminWorkspace.notifications : workspace.notifications;
  const historyEvents = currentRole === 'Admin' ? adminWorkspace.historyEvents : workspace.historyEvents;
  const reports = useMemo(
    () => currentRole === 'Admin'
      ? adminWorkspace.reports
      : mergeWorkspaceRecords(workspace.reports, apiReports),
    [adminWorkspace.reports, apiReports, currentRole, workspace.reports],
  );
  const additionOptions = adminWorkspace.additionOptions;
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<DashboardFilterState>(initialDashboardFilterState);
  const [uiState, setUiState] = useState<DashboardUiState>({
    activeModal: null,
    editingService: null,
    editingBusiness: null,
    selectedPlanBusiness: null,
    editingCustomer: null,
    editingEmployee: null,
    editingDepartment: null,
    editingAccount: null,
    editingExpense: null,
    editingTransaction: null,
    selectedTransaction: null,
    selectedCustomerHistory: null,
    selectedHistoryEvent: null,
    selectedReport: null,
    selectedOption: null,
    pendingDelete: null,
    transactionDeleteReason: '',
    workflowDraft: null,
    favoriteServiceIds: ['service-1', 'service-3'],
  });
  const [dismissedGeneratedNotificationIds, setDismissedGeneratedNotificationIds] = useState<string[]>([]);
  const [isTransactionFiltersOpen, setIsTransactionFiltersOpen] = useState(false);
  const [isAdminPlanFiltersOpen, setIsAdminPlanFiltersOpen] = useState(false);
  const {
    historyStatus: historyStatusFilter,
    businessDirectory: businessDirectoryFilters,
    transaction: transactionFilters,
    department: departmentFilters,
    adminPlan: adminPlanFilters,
  } = filterState;
  const {
    searchInput: departmentSearchInput,
    searchQuery: departmentSearchQuery,
    accountStatus: departmentAccountStatusFilter,
  } = departmentFilters;
  const {
    activeModal,
    editingService,
    editingBusiness,
    selectedPlanBusiness,
    editingCustomer,
    editingEmployee,
    editingDepartment,
    editingAccount,
    editingExpense,
    editingTransaction,
    selectedTransaction,
    selectedCustomerHistory,
    selectedHistoryEvent,
    selectedReport,
    selectedOption,
    pendingDelete,
    transactionDeleteReason,
    workflowDraft,
    favoriteServiceIds,
  } = uiState;

  const updateUiState = <K extends keyof DashboardUiState>(
    key: K,
    value: DashboardUiState[K] | ((previous: DashboardUiState[K]) => DashboardUiState[K]),
  ) => {
    setUiState((current) => ({
      ...current,
      [key]: resolveStateValue(current[key], value),
    }));
  };

  const updateFilterState = <K extends keyof DashboardFilterState>(
    key: K,
    value: DashboardFilterState[K] | ((previous: DashboardFilterState[K]) => DashboardFilterState[K]),
  ) => {
    setFilterState((current) => ({
      ...current,
      [key]: resolveStateValue(current[key], value),
    }));
  };

  const updateTransactionFilters = (value: DataTableFiltersValue) => {
    updateFilterState('transaction', value);
  };

  const updateDepartmentFilters = <K extends keyof DepartmentFilterState>(
    key: K,
    value: DepartmentFilterState[K] | ((previous: DepartmentFilterState[K]) => DepartmentFilterState[K]),
  ) => {
    updateFilterState('department', (current) => ({
      ...current,
      [key]: resolveStateValue(current[key], value),
    }));
  };

  const updateAdminPlanFilters = (value: DataTableFiltersValue) => {
    updateFilterState('adminPlan', value);
  };

  const setHistoryStatusFilter: React.Dispatch<React.SetStateAction<HistoryStatusFilter>> = (value) => {
    updateFilterState('historyStatus', value);
  };

  const setBusinessDirectoryFilters: React.Dispatch<React.SetStateAction<DataTableFiltersValue>> = (value) => {
    updateFilterState('businessDirectory', value);
  };

  const setDepartmentSearchInput: React.Dispatch<React.SetStateAction<string>> = (value) => {
    updateDepartmentFilters('searchInput', value);
  };

  const setDepartmentAccountStatusFilter: React.Dispatch<React.SetStateAction<DepartmentAccountStatusFilter>> = (value) => {
    updateDepartmentFilters('accountStatus', value);
  };

  const currentEmployee = currentRole === 'Employee'
    ? employees.find((employee) => employee.id === currentUser.id) || null
    : null;
  const adminAccountEmail = useMemo(() => {
    const adminUser = currentRole === 'Admin'
      ? currentUser
      : getAvailableUsers().find((user) => user.role === 'Admin');

    return (adminUser?.email || '').trim().toLowerCase();
  }, [currentRole, currentUser]);
  const sessionPermissions = useMemo(() => {
    if (currentRole === 'Employee') {
      return intersectCustomerPermissions(
        currentBusiness?.permissions ?? currentUser.permissions ?? buildDefaultCustomerPermissions(),
        currentEmployee?.permissions ?? currentUser.permissions ?? currentBusiness?.permissions ?? buildDefaultCustomerPermissions(),
      );
    }

    if (currentRole === 'Customer') {
      return currentUser.permissions ?? currentBusiness?.permissions ?? null;
    }

    return currentBusiness?.permissions ?? currentUser.permissions ?? null;
  }, [currentBusiness?.permissions, currentEmployee?.permissions, currentRole, currentUser.permissions]);
  const currentBusinessAccessState = useMemo(
    () => currentRole === 'Admin' ? null : getBusinessAccessState(currentBusiness),
    [currentBusiness, currentRole],
  );
  const isBusinessSubscriptionLocked = currentRole === 'Customer' && Boolean(currentBusinessAccessState?.isSubscriptionLocked);
  const effectiveSessionPermissions = isBusinessSubscriptionLocked ? null : sessionPermissions;
  const displayUserName = currentRole === 'Customer'
    ? currentBusiness?.name || currentUser.name
    : currentUser.name;
  const accessContext = useMemo(
    () => ({
      role: currentRole,
      businessId: currentUser.businessId,
      permissions: effectiveSessionPermissions,
    }),
    [currentRole, currentUser.businessId, effectiveSessionPermissions],
  );
  const canAccessOnboardingServices = currentRole === 'Customer' && canAccessModuleForSession(accessContext, 'services');
  const effectiveOnboardingStep: BusinessOnboardingStep = currentBusiness?.onboardingStep === 'services' && !canAccessOnboardingServices
    ? 'customers'
    : currentBusiness?.onboardingStep || 'welcome';
  const shouldShowBusinessOnboarding = currentRole === 'Customer'
    && !isBusinessSubscriptionLocked
    && Boolean(currentBusiness)
    && !currentBusiness?.onboardingCompleted;
  const shouldRequireDepartmentSetup = currentRole === 'Customer'
    && !isBusinessSubscriptionLocked
    && !shouldShowBusinessOnboarding
    && counters.length === 0;
  const tokenAssignedDepartmentId = currentUser.counterId || currentUser.departmentId;
  const resolvedAssignedDepartmentId = tokenAssignedDepartmentId || currentEmployee?.departmentId;
  const availableCounters = currentRole === 'Employee'
    ? resolvedAssignedDepartmentId
      ? counters.filter((counter) => counter.id === resolvedAssignedDepartmentId)
      : []
    : counters;
  const employeeAssignedDepartment = resolvedAssignedDepartmentId
    ? counters.find((counter) => counter.id === resolvedAssignedDepartmentId)
    : null;

  const requestedCounterId = selectedCounterId || tokenAssignedDepartmentId;
  const safeSelectedCounterId = availableCounters.some((counter) => counter.id === requestedCounterId)
    ? requestedCounterId || ''
    : availableCounters[0]?.id || '';
  const selectedCounter = availableCounters.find((counter) => counter.id === safeSelectedCounterId) || availableCounters[0];
  const selectedDepartmentName = selectedCounter?.name || '';
  const departmentScopedServices = getServicesForDepartment(services, safeSelectedCounterId || undefined);
  const visibleServices = useVisibleServiceRecords(accessContext, departmentScopedServices);
  const visibleCustomers = useVisibleCustomerRecords(accessContext, customers);
  const visibleTransactionHistory = useVisibleTransactionRecords(accessContext, transactionHistory);
  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'Active').length,
    [accounts],
  );
  const totalAccountBalance = useMemo(
    () => accounts.reduce((total, account) => total + account.currentBalance, 0),
    [accounts],
  );
  const filteredHistoryEvents = useMemo(
    () => historyStatusFilter === 'All'
      ? historyEvents
      : historyEvents.filter((event) => event.status === historyStatusFilter),
    [historyEvents, historyStatusFilter],
  );
  const favoriteServices = useMemo(
    () => visibleServices.filter((service) => favoriteServiceIds.includes(service.id)),
    [favoriteServiceIds, visibleServices],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isSearchActive = !isBusinessSubscriptionLocked && normalizedSearchQuery.length > 0;
  const searchMatches = useSearchResults({
    context: accessContext,
    query: isSearchActive ? normalizedSearchQuery : '',
    services: departmentScopedServices,
    customers,
    transactions: transactionHistory,
  });

  const deferredBusinessSearchQuery = useDeferredValue(businessDirectoryFilters.search.trim().toLowerCase());
  const businessPermissionFilterValues = useMemo(
    () => readDataTableMultiSelectFilter(businessDirectoryFilters, 'permissions'),
    [businessDirectoryFilters],
  );
  const businessStatusFilterValue = useMemo(
    () => readDataTableSingleSelectFilter(businessDirectoryFilters, 'status'),
    [businessDirectoryFilters],
  );
  const businessJoinedDateFilter = useMemo(
    () => readDataTableDateRangeFilter(businessDirectoryFilters, 'joinedDate'),
    [businessDirectoryFilters],
  );
  const activeBusinessFilterCount = [
    deferredBusinessSearchQuery ? 1 : 0,
    businessPermissionFilterValues.length > 0 ? 1 : 0,
    businessStatusFilterValue ? 1 : 0,
    businessJoinedDateFilter.from || businessJoinedDateFilter.to ? 1 : 0,
  ].filter(Boolean).length;
  const hasActiveBusinessDirectoryFilters = activeBusinessFilterCount > 0;
  const businessPermissionFilterLabel = hasActiveBusinessDirectoryFilters
    ? `${activeBusinessFilterCount} active filter${activeBusinessFilterCount === 1 ? '' : 's'}`
    : 'All businesses';
  const filteredBusinesses = useMemo(() => {
    const selectedPermissionIds = businessPermissionFilterValues.map(String);
    const selectedStatus = businessStatusFilterValue ? String(businessStatusFilterValue) : '';

    return businesses.filter((business) => {
      const joinedDate = (business.joinedDate || '').slice(0, 10);
      const searchText = [
        business.name,
        business.phone,
        business.email,
        business.status || 'Active',
        joinedDate,
      ].join(' ').toLowerCase();
      const matchesSearch = !deferredBusinessSearchQuery || searchText.includes(deferredBusinessSearchQuery);
      const matchesPermissions = selectedPermissionIds.length === 0 || selectedPermissionIds.some((permissionId) =>
        isPermissionEnabled(business.permissions, permissionId)
      );
      const matchesStatus = !selectedStatus || selectedStatus === (business.status || 'Active');
      const matchesFromDate = !businessJoinedDateFilter.from || (joinedDate && joinedDate >= businessJoinedDateFilter.from);
      const matchesToDate = !businessJoinedDateFilter.to || (joinedDate && joinedDate <= businessJoinedDateFilter.to);

      return matchesSearch && matchesPermissions && matchesStatus && matchesFromDate && matchesToDate;
    });
  }, [
    businessJoinedDateFilter.from,
    businessJoinedDateFilter.to,
    businessPermissionFilterValues,
    businessStatusFilterValue,
    businesses,
    deferredBusinessSearchQuery,
  ]);
  const customerListPageUi = getCustomerWorkspaceViewUi('list');
  const customerPaymentsPageUi = getCustomerWorkspaceViewUi('payments');
  const customerOutstandingPageUi = getCustomerWorkspaceViewUi('outstanding');
  const customerPageOptions = currentRole === 'Admin'
    ? [{ id: 'list' as const, label: customerListPageUi.label, description: 'Manage business directory records.' }]
    : ([
        isPermissionEnabled(accessContext.permissions, 'customers_list')
          ? { id: 'list' as const, label: customerListPageUi.label, description: customerListPageUi.emptyDescription }
          : null,
        isPermissionEnabled(accessContext.permissions, 'customers_payment_list')
          ? { id: 'payments' as const, label: customerPaymentsPageUi.label, description: customerPaymentsPageUi.emptyDescription }
          : null,
        isPermissionEnabled(accessContext.permissions, 'customers_outstanding')
          ? { id: 'outstanding' as const, label: customerOutstandingPageUi.label, description: customerOutstandingPageUi.emptyDescription }
          : null,
      ].filter((option): option is { id: CustomerWorkspaceView; label: string; description: string } => Boolean(option)));
  const requestedCustomerPageCopy = getCustomerWorkspaceViewUi(customerPageView);
  const requestedCustomerPageOption = customerPageOptions.find((option) => option.id === customerPageView) || null;
  const hasRequestedCustomerPageAccess = currentRole === 'Admin'
    ? customerPageView === 'list'
    : Boolean(requestedCustomerPageOption);
  const customerPaymentTransactions = useSortedTransactionRecords(
    currentRole === 'Admin' ? emptyTransactionRecords : transactionHistory,
  );
  const customerDirectoryRecords = currentRole === 'Admin' ? filteredBusinesses : visibleCustomers;
  const adminBusinessTotalRecords = currentRole === 'Admin'
    ? Math.max(filteredBusinesses.length, backendBusinessPagination.totalRecords - 1)
    : visibleCustomers.length;
  const adminBusinessTotalPages = currentRole === 'Admin'
    ? Math.max(1, Math.ceil(adminBusinessTotalRecords / backendBusinessPagination.limit))
    : 1;
  const customerDirectoryPagination = currentRole === 'Admin'
    ? {
        currentPage: backendBusinessPagination.currentPage,
        totalPages: adminBusinessTotalPages,
        totalRecords: adminBusinessTotalRecords,
        limit: backendBusinessPagination.limit,
        isLoading: isBackendBusinessesLoading,
        onPageChange: setBackendBusinessPage,
      }
    : undefined;
  const customerOutstandingRows: CustomerOutstandingRow[] = currentRole === 'Admin'
    ? []
    : (() => {
        const customerById = new Map(workspace.customers.map((customer) => [customer.id, customer]));
        const outstandingByCustomer = new Map<string, CustomerOutstandingRow>();

        transactionHistory
          .filter((transaction) => transaction.status === 'pending')
          .forEach((transaction) => {
            const customer = customerById.get(transaction.customerId);
            const currentRow = outstandingByCustomer.get(transaction.customerId);

            if (currentRow) {
              currentRow.pendingPayments += 1;
              currentRow.outstandingAmount += transaction.dueAmount;
              if (transaction.date > currentRow.lastPendingDate) {
                currentRow.lastPendingDate = transaction.date;
              }
              return;
            }

            outstandingByCustomer.set(transaction.customerId, {
              customerId: transaction.customerId,
              customerName: customer?.name || transaction.customerName,
              phone: customer?.phone || 'Not added',
              pendingPayments: 1,
              outstandingAmount: transaction.dueAmount,
              lastPendingDate: transaction.date,
            });
          });

        return Array.from(outstandingByCustomer.values()).sort((left, right) => {
          if (right.outstandingAmount !== left.outstandingAmount) {
            return right.outstandingAmount - left.outstandingAmount;
          }

          return right.lastPendingDate.localeCompare(left.lastPendingDate);
        });
      })();
  const selectedCustomerTransactions = useMemo(
    () => selectedCustomerHistory
      ? transactionHistory
        .filter((transaction) =>
          transaction.customerId === selectedCustomerHistory.id ||
          transaction.customerPhone === selectedCustomerHistory.phone
        )
        .sort((left, right) => right.date.localeCompare(left.date))
      : [],
    [selectedCustomerHistory, transactionHistory],
  );
  const selectedCustomerSummary = useMemo(() => ({
    totalTransactions: selectedCustomerTransactions.length,
    grossAmount: selectedCustomerTransactions.reduce((total, transaction) => total + transaction.totalAmount, 0),
    collectedAmount: selectedCustomerTransactions.reduce((total, transaction) => total + transaction.paidAmount, 0),
    outstandingAmount: selectedCustomerTransactions.reduce((total, transaction) => total + transaction.dueAmount, 0),
    lastVisit: selectedCustomerTransactions[0]?.date || 'No transactions',
  }), [selectedCustomerTransactions]);
  const todayDate = new Date().toISOString().split('T')[0];
  const todayReportSummary = useMemo(
    () => buildDailyClosingSummary(transactionHistory, expenses, todayDate),
    [expenses, todayDate, transactionHistory],
  );

  const canViewCustomerRecords = currentRole === 'Admin' || canViewModuleRecords('customers');
  const canAddCustomerRecords = canPerformModuleAction('customers', 'add');
  const canEditCustomerRecords = canPerformModuleAction('customers', 'edit');
  const canDeleteCustomerRecords = canPerformModuleAction('customers', 'delete');
  const canViewEmployeeRecords = canViewModuleRecords('employee');
  const canAddEmployeeRecords = canPerformModuleAction('employee', 'add');
  const canEditEmployeeRecords = canPerformModuleAction('employee', 'edit');
  const canDeleteEmployeeRecords = canPerformModuleAction('employee', 'delete');
  const canAddDepartmentRecords = canPerformModuleAction('departments', 'add');
  const canEditDepartmentRecords = canPerformModuleAction('departments', 'edit');
  const canDeleteDepartmentRecords = canPerformModuleAction('departments', 'delete');
  const canAddAccountRecords = canPerformModuleAction('accounts', 'add');
  const canEditAccountRecords = canPerformModuleAction('accounts', 'edit');
  const canDeleteAccountRecords = canPerformModuleAction('accounts', 'delete');

  const customerEntityLabel = currentRole === 'Admin' ? 'User' : 'Customer';
  const customerEntityPlural = currentRole === 'Admin' ? 'Users' : 'Customers';
  const customerDirectoryCount = currentRole === 'Admin' ? adminBusinessTotalRecords : visibleCustomers.length;
  const customerSectionTitle = currentRole === 'Admin'
    ? customerPageView === 'list'
      ? 'Manage users'
      : requestedCustomerPageCopy.label
    : requestedCustomerPageCopy.label;
  const customerSectionDescription = currentRole === 'Admin'
    ? customerPageView === 'list'
      ? 'Monitor the users managed in the platform from one place.'
      : 'The admin workspace only supports the user directory on customer routes.'
    : requestedCustomerPageCopy.emptyDescription;
  const activeVisibleServiceCount = visibleServices.filter((service) => service.status === 'Active').length;
  const serviceCategoryCount = new Set(visibleServices.map((service) => service.category)).size;
  const scopedTransactionRecords = selectedCounter?.id
    ? visibleTransactionHistory.filter((transaction) => transaction.departmentId === selectedCounter.id)
    : visibleTransactionHistory;
  const scopedCollectedAmount = scopedTransactionRecords.reduce((total, transaction) => total + transaction.paidAmount, 0);

  const serviceSummary = [
    {
      title: 'Total Services',
      value: `${visibleServices.length}`,
      detail: selectedDepartmentName ? `${selectedDepartmentName} catalog` : 'Visible service catalog',
      icon: <FaCog />,
      colorClass: 'bg-primary',
    },
    { title: 'Active Services', value: `${activeVisibleServiceCount}`, detail: 'Ready for new transactions', icon: <FaChartLine />, colorClass: 'bg-success' },
    {
      title: 'Collected Amount',
      value: `Rs. ${scopedCollectedAmount.toLocaleString('en-IN')}`,
      detail: selectedDepartmentName ? `${selectedDepartmentName} collections` : 'Across visible transactions',
      icon: <FaDollarSign />,
      colorClass: 'bg-info',
    },
    { title: 'Categories', value: `${serviceCategoryCount}`, detail: 'Distinct service groups on record', icon: <FaFolderOpen />, colorClass: 'bg-warning' },
  ];

  const customerSummary = useMemo(() => {
    if (currentRole === 'Admin') {
      const activeBusinesses = businesses.filter((business) => business.status !== 'Inactive').length;
      const inactiveBusinesses = businesses.length - activeBusinesses;

      return [
        { title: 'Total Users', value: `${customerDirectoryCount}`, detail: 'All registered user logins', icon: <FaUsers />, colorClass: 'bg-primary' },
        { title: 'Active Users', value: `${activeBusinesses}`, detail: 'Active records on this page', icon: <FaUsersCog />, colorClass: 'bg-success' },
        { title: 'Inactive Users', value: `${inactiveBusinesses}`, detail: 'Inactive records on this page', icon: <FaFolderOpen />, colorClass: 'bg-warning' },
        { title: 'Filter Match', value: `${filteredBusinesses.length}`, detail: `Filter: ${businessPermissionFilterLabel}`, icon: <FaChartLine />, colorClass: 'bg-info' },
      ];
    }

    const activeCustomers = visibleCustomers.filter((customer) => customer.status !== 'Inactive').length;
    const customersWithEmail = visibleCustomers.filter((customer) => customer.email).length;

    return [
      { title: `Total ${customerEntityPlural}`, value: `${customerDirectoryCount}`, detail: 'All registered customers', icon: <FaUsers />, colorClass: 'bg-primary' },
      { title: 'Active Customers', value: `${activeCustomers}`, detail: 'Available for new transactions', icon: <FaUsersCog />, colorClass: 'bg-success' },
      { title: 'With Email', value: `${customersWithEmail}`, detail: 'Contactable customer records', icon: <FaFolderOpen />, colorClass: 'bg-warning' },
      { title: 'Outstanding', value: `${customerOutstandingRows.length}`, detail: 'Customers with pending balances', icon: <FaHourglassHalf />, colorClass: 'bg-info' },
    ];
  }, [
    businessPermissionFilterLabel,
    businesses,
    currentRole,
    customerDirectoryCount,
    customerEntityPlural,
    customerOutstandingRows.length,
    filteredBusinesses.length,
    visibleCustomers,
  ]);

  const accountSummary = useMemo(() => [
    { title: 'Total Accounts', value: `${accounts.length}`, detail: 'Bank accounts on record', icon: <FaUniversity />, colorClass: 'bg-primary' },
    { title: 'Active Accounts', value: `${activeAccounts}`, detail: 'Ready for transactions', icon: <FaChartLine />, colorClass: 'bg-success' },
    { title: 'Total Balance', value: `Rs. ${totalAccountBalance.toLocaleString('en-IN')}`, detail: 'Current available balance', icon: <FaDollarSign />, colorClass: 'bg-info' },
    { title: 'Review Needed', value: `${accounts.length - activeAccounts}`, detail: 'Inactive or paused accounts', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
  ], [accounts.length, activeAccounts, totalAccountBalance]);

  const transactionStats = useTransactionStats(visibleTransactionHistory);
  const {
    departments: transactionDepartmentOptions,
    handlers: transactionHandlerOptions,
  } = useTransactionFilterOptions(visibleTransactionHistory);
  const filteredTransactionRecords = useFilteredTransactionRecords(visibleTransactionHistory, {
    query: transactionFilters.search,
    status: (transactionFilters.fields.status as TransactionStatusFilter) || 'All',
    paymentMode: (transactionFilters.fields.paymentMode as TransactionPaymentModeFilter) || 'All',
    department: typeof transactionFilters.fields.department === 'string' ? transactionFilters.fields.department : 'All',
    handler: typeof transactionFilters.fields.handler === 'string' ? transactionFilters.fields.handler : 'All',
    dateFrom: (transactionFilters.fields.date as any)?.from || '',
    dateTo: (transactionFilters.fields.date as any)?.to || '',
  });

  const transactionFiltersConfig: DataTableFiltersConfig = {
    search: {
      enabled: true,
      fields: ['transactionNumber', 'customerName', 'customerPhone', 'service', 'paymentMode', 'departmentName', 'handledByName'],
      label: 'Search',
    },
    fields: [
      {
        field: 'status',
        label: 'Status',
        type: 'single-select',
        options: [
          { label: 'All', value: 'All' },
          { label: 'Completed', value: 'completed' },
          { label: 'Pending', value: 'pending' },
          { label: 'Cancelled', value: 'cancelled' },
          { label: 'Refunded', value: 'refunded' },
        ],
      },
      {
        field: 'paymentMode',
        label: 'Payment Mode',
        type: 'single-select',
        options: [
          { label: 'All', value: 'All' },
          { label: 'Cash', value: 'cash' },
          { label: 'UPI', value: 'upi' },
          { label: 'Bank', value: 'bank' },
          { label: 'Card', value: 'card' },
        ],
      },
      {
        field: 'department',
        label: 'Department',
        type: 'single-select',
        options: [{ label: 'All', value: 'All' }, ...transactionDepartmentOptions.map(d => ({ label: d, value: d }))],
      },
      {
        field: 'handler',
        label: 'Handled By',
        type: 'single-select',
        options: [{ label: 'All', value: 'All' }, ...transactionHandlerOptions.map(h => ({ label: h, value: h }))],
      },
      {
        field: 'date',
        label: 'Date',
        type: 'date-range',
      },
    ],
  };

  const adminPlanFiltersConfig: DataTableFiltersConfig = {
    search: {
      enabled: true,
      fields: ['businessName', 'businessPhone', 'businessEmail', 'planLabel'],
      label: 'Search',
    },
    fields: [
      {
        field: 'planId',
        label: 'Plan',
        type: 'single-select',
        options: [{ label: 'All', value: 'All' }, ...businessSubscriptionPlans.map(p => ({ label: p.label, value: p.id }))],
      },
      {
        field: 'status',
        label: 'Plan Status',
        type: 'single-select',
        options: [
          { label: 'All', value: 'All' },
          { label: 'Trial', value: 'trial' },
          { label: 'Active', value: 'active' },
          { label: 'Expired', value: 'expired' },
          { label: 'Cancelled', value: 'cancelled' },
        ],
      },
      {
        field: 'workspace',
        label: 'Workspace Access',
        type: 'single-select',
        options: [
          { label: 'All', value: 'All' },
          { label: 'Active', value: 'Active' },
          { label: 'Locked', value: 'Locked' },
        ],
      },
      {
        field: 'expiry',
        label: 'Expiry Window',
        type: 'single-select',
        options: [
          { label: 'All', value: 'All' },
          { label: 'Expiring Soon', value: 'Expiring Soon' },
          { label: 'Expired', value: 'Expired' },
          { label: 'Cancelled', value: 'Cancelled' },
        ],
      },
    ],
  };

  const hasActiveTransactionFilters = transactionFilters.search.trim() !== '' ||
    transactionFilters.fields.status !== '' ||
    transactionFilters.fields.paymentMode !== '' ||
    transactionFilters.fields.department !== '' ||
    transactionFilters.fields.handler !== '' ||
    (transactionFilters.fields.date as any)?.from !== '' ||
    (transactionFilters.fields.date as any)?.to !== '';

  const hasActiveAdminPlanFilters = adminPlanFilters.search.trim() !== '' ||
    adminPlanFilters.fields.planId !== '' ||
    adminPlanFilters.fields.status !== '' ||
    adminPlanFilters.fields.workspace !== '' ||
    adminPlanFilters.fields.expiry !== '';

  const transactionSummary = useMemo(() => [
    { title: 'Total Volume', value: `Rs. ${transactionStats.totalVolume.toLocaleString('en-IN')}`, detail: 'Transactions this month', icon: <FaReceipt />, colorClass: 'bg-primary' },
    { title: 'Completed', value: `${transactionStats.completed}`, detail: 'Successfully processed', icon: <FaChartLine />, colorClass: 'bg-success' },
    { title: 'Pending', value: `${transactionStats.pending}`, detail: 'Waiting authorization', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
    { title: 'Adjusted', value: `${transactionStats.disputes}`, detail: 'Cancelled or refunded records', icon: <FaHistory />, colorClass: 'bg-danger' },
  ], [transactionStats]);

  const adminBusinessPlanRows = useMemo(() => (
    businesses.map((business) => {
      const accessState = getBusinessAccessState(business);
      const businessWorkspace = businessWorkspacesById[business.id];

      return {
        businessId: business.id,
        businessName: business.name,
        businessPhone: business.phone,
        businessEmail: business.email,
        joinedDate: business.joinedDate || 'Not added',
        planId: accessState.subscription.planId,
        planLabel: accessState.subscription.plan.label,
        planStatus: accessState.subscription.status,
        planStatusLabel: getSubscriptionStatusLabel(accessState.subscription.status),
        planStatusClass: getSubscriptionStatusClass(accessState.subscription.status),
        workspaceStatus: accessState.status,
        workspaceStatusLabel: accessState.status === 'Active' ? 'Active' : 'Locked',
        workspaceStatusClass: `status-chip ${accessState.status === 'Active' ? 'status-chip--active' : 'status-chip--failed'}`,
        startDate: accessState.subscription.startDate,
        endDate: accessState.subscription.endDate,
        daysRemaining: accessState.subscription.daysRemaining,
        employeeCount: businessWorkspace?.employees.length || 0,
        transactionCount: businessWorkspace?.transactions.length || 0,
        isExpiringSoon: accessState.subscription.isAccessible && accessState.subscription.daysRemaining <= 14,
        isLocked: accessState.status === 'Inactive',
      };
    })
  ), [businessWorkspacesById, businesses]);

  const adminExpiringBusinessRows = useMemo(
    () => adminBusinessPlanRows
      .filter((row) => row.isExpiringSoon)
      .sort((left, right) => left.daysRemaining - right.daysRemaining),
    [adminBusinessPlanRows],
  );

  const adminGeneratedNotifications = useMemo(() => {
    if (currentRole !== 'Admin') {
      return [];
    }

    const expiringSoonAlerts = adminExpiringBusinessRows.slice(0, 4).map((row) => ({
      id: `subscription-alert-expiring-${row.businessId}`,
      type: 'warning' as const,
      message: `${row.businessName} plan expires in ${row.daysRemaining} day${row.daysRemaining === 1 ? '' : 's'}.`,
      timestamp: `Ends on ${row.endDate}`,
    }));
    const lockedAlerts = adminBusinessPlanRows
      .filter((row) => row.isLocked)
      .slice(0, 3)
      .map((row) => ({
        id: `subscription-alert-locked-${row.businessId}`,
        type: 'error' as const,
        message: `${row.businessName} workspace is locked because the ${row.planStatusLabel.toLowerCase()} plan needs attention.`,
        timestamp: `Plan ended ${row.endDate}`,
      }));

    return [...expiringSoonAlerts, ...lockedAlerts].filter(
      (notification) => !dismissedGeneratedNotificationIds.includes(notification.id),
    );
  }, [adminBusinessPlanRows, adminExpiringBusinessRows, currentRole, dismissedGeneratedNotificationIds]);

  const notifications = currentRole === 'Admin'
    ? [...adminGeneratedNotifications, ...baseNotifications]
    : baseNotifications;
  const filteredAdminPlanRows = useMemo(() => {
    return adminBusinessPlanRows.filter((row) => {
      const searchQuery = adminPlanFilters.search.trim().toLowerCase();
      const matchesQuery = !searchQuery || [
        row.businessName,
        row.businessPhone,
        row.businessEmail,
        row.planLabel,
      ].join(' ').toLowerCase().includes(searchQuery);
      const planId = adminPlanFilters.fields.planId || 'All';
      const matchesPlan = planId === 'All' || row.planId === planId;
      const status = adminPlanFilters.fields.status || 'All';
      const matchesPlanStatus = status === 'All' || row.planStatus === status;
      const workspace = adminPlanFilters.fields.workspace || 'All';
      const matchesWorkspace = workspace === 'All'
        || (workspace === 'Active' ? row.workspaceStatus === 'Active' : row.workspaceStatus !== 'Active');
      const expiry = adminPlanFilters.fields.expiry || 'All';
      const matchesExpiry = expiry === 'All'
        || (expiry === 'Expiring Soon' ? row.isExpiringSoon : false)
        || (expiry === 'Expired' ? row.planStatus === 'expired' : false)
        || (expiry === 'Cancelled' ? row.planStatus === 'cancelled' : false);

      return matchesQuery && matchesPlan && matchesPlanStatus && matchesWorkspace && matchesExpiry;
    });
  }, [adminBusinessPlanRows, adminPlanFilters]);

  const adminDashboardSummary = useMemo(() => [
    { title: 'Businesses', value: `${businesses.length}`, detail: 'Managed in the admin workspace', icon: <FaUsers />, colorClass: 'bg-primary' },
    {
      title: 'Active Plans',
      value: `${adminBusinessPlanRows.filter((row) => row.planStatus === 'active' || row.planStatus === 'trial').length}`,
      detail: 'Subscriptions currently allowing access',
      icon: <FaChartLine />,
      colorClass: 'bg-success',
    },
    {
      title: 'Expiring Soon',
      value: `${adminExpiringBusinessRows.length}`,
      detail: 'Businesses with 14 days or less left',
      icon: <FaHourglassHalf />,
      colorClass: 'bg-warning',
    },
    {
      title: 'Locked Workspaces',
      value: `${adminBusinessPlanRows.filter((row) => row.isLocked).length}`,
      detail: 'Plans that need renewal or reactivation',
      icon: <FaExclamationTriangle />,
      colorClass: 'bg-danger',
    },
  ], [adminBusinessPlanRows, adminExpiringBusinessRows.length, businesses.length]);

  const adminPlanDistribution = useMemo(() => (
    businessSubscriptionPlans.map((plan) => ({
      id: plan.id,
      label: plan.label,
      count: adminBusinessPlanRows.filter((row) => row.planId === plan.id).length,
      durationLabel: plan.durationLabel,
    }))
  ), [adminBusinessPlanRows]);

  const historySummary = useMemo(() => [
    { title: 'Recent Events', value: `${historyEvents.length}`, detail: 'System logs today', icon: <FaHistory />, colorClass: 'bg-primary' },
    { title: 'Critical Alerts', value: `${historyEvents.filter((event) => event.status === 'Failed').length}`, detail: 'Immediate attention', icon: <FaBell />, colorClass: 'bg-danger' },
    { title: 'System Changes', value: `${historyEvents.filter((event) => event.module !== 'Transactions').length}`, detail: 'Policy updates', icon: <FaTools />, colorClass: 'bg-success' },
    { title: 'Audit Entries', value: `${historyEvents.filter((event) => event.status === 'Completed').length}`, detail: 'Verified actions', icon: <FaArchive />, colorClass: 'bg-info' },
  ], [historyEvents]);

  const reportSummary = useMemo(() => {
    if (currentRole === 'Admin') {
      return [
        { title: 'Admin Reports', value: `${reports.length}`, detail: 'Reports in the admin workspace', icon: <FaChartLine />, colorClass: 'bg-primary' },
        { title: 'Ready Reports', value: `${reports.filter((report) => report.status === 'Ready').length}`, detail: 'Generated reports', icon: <FaFileAlt />, colorClass: 'bg-success' },
        { title: 'Scheduled', value: `${reports.filter((report) => report.status === 'Scheduled').length}`, detail: 'Waiting for delivery', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
        { title: 'Drafts', value: `${reports.filter((report) => report.status === 'Draft').length}`, detail: 'Not finalized yet', icon: <FaFolderOpen />, colorClass: 'bg-info' },
      ];
    }

    return [
      { title: 'Today Collected', value: `Rs. ${todayReportSummary.collectedAmount.toLocaleString('en-IN')}`, detail: 'Posted collections for today', icon: <FaChartLine />, colorClass: 'bg-primary' },
      { title: 'Outstanding', value: `Rs. ${todayReportSummary.outstandingAmount.toLocaleString('en-IN')}`, detail: 'Pending amount still open', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
      { title: 'Net Amount', value: `Rs. ${todayReportSummary.netAmount.toLocaleString('en-IN')}`, detail: 'Collected minus today’s expenses', icon: <FaDollarSign />, colorClass: 'bg-success' },
      { title: 'Ready Reports', value: `${reports.filter((report) => report.status === 'Ready').length}`, detail: 'Saved report snapshots', icon: <FaFolderOpen />, colorClass: 'bg-info' },
    ];
  }, [currentRole, reports, todayReportSummary]);

  const reminderSummary = useMemo(() => [
    { title: 'Open Alerts', value: `${notifications.length}`, detail: 'Notifications waiting for review', icon: <FaBell />, colorClass: 'bg-primary' },
    { title: 'Failed Events', value: `${historyEvents.filter((event) => event.status === 'Failed').length}`, detail: 'Need follow-up from the team', icon: <FaExclamationTriangle />, colorClass: 'bg-danger' },
    { title: 'Pending Events', value: `${historyEvents.filter((event) => event.status === 'Pending').length}`, detail: 'Still moving through the workflow', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
    { title: 'Resolved Logs', value: `${historyEvents.filter((event) => event.status === 'Completed').length}`, detail: 'Completed reminder activity', icon: <FaArchive />, colorClass: 'bg-success' },
  ], [historyEvents, notifications.length]);

  const visibleEmployees = canViewEmployeeRecords ? employees : [];
  const employeeSummary = [
    { title: 'Total Employees', value: `${visibleEmployees.length}`, detail: 'Staff records in the directory', icon: <FaUsersCog />, colorClass: 'bg-primary' },
    { title: 'Active Employees', value: `${visibleEmployees.filter((employee) => employee.status === 'Active').length}`, detail: 'Ready for daily operations', icon: <FaUsers />, colorClass: 'bg-success' },
    { title: 'Recently Added', value: `${visibleEmployees.slice(0, 2).length}`, detail: 'Latest joined team members', icon: <FaPlusCircle />, colorClass: 'bg-warning' },
    { title: 'With Email', value: `${visibleEmployees.filter((employee) => employee.email).length}`, detail: 'Contact-ready staff records', icon: <FaFileAlt />, colorClass: 'bg-info' },
  ];

  const departmentRows = useMemo(
    () => counters.map((counter) => ({
      counter,
      linkedAccounts: getDepartmentLinkedAccounts(counter, accounts),
      defaultAccount: getDepartmentDefaultAccount(counter, accounts) || null,
    })),
    [accounts, counters],
  );

  const filteredDepartments = useMemo(
    () =>
      departmentRows.filter(({ counter, linkedAccounts, defaultAccount }) => {
        const matchesFilter = departmentAccountStatusFilter === 'All'
          ? true
          : departmentAccountStatusFilter === 'Unassigned'
            ? linkedAccounts.length === 0
            : linkedAccounts.some((account) => account.status === departmentAccountStatusFilter);

        const matchesSearch = !departmentSearchQuery || [
          counter.name,
          counter.code,
          defaultAccount?.accountHolder || '',
          defaultAccount?.bankName || '',
          ...linkedAccounts.map((account) => `${account.accountHolder} ${account.bankName} ${account.accountNumber}`),
        ]
          .join(' ')
          .toLowerCase()
          .includes(departmentSearchQuery);

        return matchesFilter && matchesSearch;
      }),
    [departmentAccountStatusFilter, departmentRows, departmentSearchQuery],
  );

  const departmentSummary = useMemo(() => [
    { title: 'Total Departments', value: `${counters.length}`, detail: 'Counters mapped for business operations', icon: <FaBuilding />, colorClass: 'bg-primary' },
    { title: 'Active Departments', value: `${counters.filter((counter) => counter.status === 'Active').length}`, detail: 'Departments currently running', icon: <FaChartLine />, colorClass: 'bg-success' },
    { title: 'Linked Accounts', value: `${departmentRows.filter((row) => row.linkedAccounts.length > 0).length}`, detail: 'Departments already assigned to bank accounts', icon: <FaUniversity />, colorClass: 'bg-info' },
    { title: 'Inactive Accounts', value: `${departmentRows.filter((row) => row.linkedAccounts.some((account) => account.status === 'Inactive')).length}`, detail: 'Departments tied to paused accounts', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
  ], [counters, departmentRows]);

  const expenseSummary = useMemo(() => [
    { title: 'Total Expenses', value: `${expenses.length}`, detail: 'Tracked entries in the ledger', icon: <FaReceipt />, colorClass: 'bg-primary' },
    { title: 'Expense Value', value: `Rs. ${expenses.reduce((total, expense) => total + expense.amount, 0).toLocaleString('en-IN')}`, detail: 'Current recorded spend', icon: <FaDollarSign />, colorClass: 'bg-danger' },
    { title: 'Active Entries', value: `${expenses.filter((expense) => expense.status === 'Active').length}`, detail: 'Open expense records', icon: <FaChartLine />, colorClass: 'bg-success' },
    { title: 'Categories', value: `${new Set(expenses.map((expense) => expense.category)).size}`, detail: 'Different expense buckets', icon: <FaFolderOpen />, colorClass: 'bg-info' },
  ], [expenses]);
  const workflowDraftToken = workflowDraft?.token;

  useEffect(() => {
    if (activeTab === 'transactions' && workflowDraftToken) {
      window.setTimeout(() => {
        document.getElementById('service-workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }, [activeTab, workflowDraftToken]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleDepartmentSearch = () => {
    updateDepartmentFilters('searchQuery', departmentSearchInput.trim().toLowerCase());
  };

  const clearDepartmentFilters = () => {
    updateFilterState('department', initialDepartmentFilterState);
  };

  const clearTransactionFilters = () => {
    updateFilterState('transaction', buildEmptyDataTableFiltersValue(transactionFiltersConfig));
  };

  const clearAdminPlanFilters = () => {
    updateFilterState('adminPlan', buildEmptyDataTableFiltersValue(adminPlanFiltersConfig));
  };

  const renderTransactionFilters = () => (
    <ActionModal
      title="Filter Transactions"
      eyebrow="Transaction Filters"
      description="Choose filters, then click Filter to update the transaction list."
      onClose={() => setIsTransactionFiltersOpen(false)}
    >
      <DataTableFilters
        filters={transactionFiltersConfig}
        value={transactionFilters}
        onChange={updateTransactionFilters}
        showHeader={false}
        showFooterHint={false}
        className="table-filter-panel--modal"
      />
      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsTransactionFiltersOpen(false)}>
          Cancel
        </button>
        <button type="button" className="btn-app btn-app-primary" onClick={() => setIsTransactionFiltersOpen(false)}>
          Filter
        </button>
      </div>
    </ActionModal>
  );

  const renderAdminPlanFilters = () => (
    <ActionModal
      title="Filter Subscriptions"
      eyebrow="Subscription Filters"
      description="Choose filters, then click Filter to update the subscription list."
      onClose={() => setIsAdminPlanFiltersOpen(false)}
    >
      <DataTableFilters
        filters={adminPlanFiltersConfig}
        value={adminPlanFilters}
        onChange={updateAdminPlanFilters}
        showHeader={false}
        showFooterHint={false}
        className="table-filter-panel--modal"
      />
      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsAdminPlanFiltersOpen(false)}>
          Cancel
        </button>
        <button type="button" className="btn-app btn-app-primary" onClick={() => setIsAdminPlanFiltersOpen(false)}>
          Filter
        </button>
      </div>
    </ActionModal>
  );

  function startWorkflowWithDraft(
    draft: Omit<ServiceWorkflowDraft, 'token'>,
    options?: { departmentId?: string; notice?: string }
  ) {
    if (options?.departmentId && availableCounters.some((counter) => counter.id === options.departmentId)) {
      setSelectedCounterId(options.departmentId);
    }

    updateUiState('workflowDraft', {
      token: createRecordId(),
      ...draft,
    });
    setIsTransactionFiltersOpen(false);
    onNavigate('transactions');
    closeModal();

    if (options?.notice) {
      addNotification('info', options.notice);
    }
  }

  const closeModal = () => {
    updateUiState('activeModal', null);
    updateUiState('editingBusiness', null);
    updateUiState('selectedPlanBusiness', null);
    updateUiState('editingService', null);
    updateUiState('editingCustomer', null);
    updateUiState('editingEmployee', null);
    updateUiState('editingDepartment', null);
    updateUiState('editingAccount', null);
    updateUiState('editingExpense', null);
    updateUiState('editingTransaction', null);
    updateUiState('selectedTransaction', null);
    updateUiState('selectedCustomerHistory', null);
    updateUiState('selectedHistoryEvent', null);
    updateUiState('selectedReport', null);
    updateUiState('selectedOption', null);
    updateUiState('pendingDelete', null);
    updateUiState('transactionDeleteReason', '');
  };

  const addNotification = (type: 'success' | 'warning' | 'error' | 'info', message: string) => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      businessId: currentRole === 'Admin' ? undefined : currentUser.businessId,
      payload: { type, message },
    });
  };

  const getModuleLabel = (moduleId: string) =>
    getModuleDisplayById(moduleId, currentRole)?.label || getModuleUiLabel(moduleId) || 'this module';

  function canPerformModuleAction(moduleId: string, action: 'add' | 'edit' | 'delete') {
    return canPerformModuleActionForSession(accessContext, moduleId, action);
  }

  function canManageModule(moduleId: string) {
    return canManageModuleForSession(accessContext, moduleId);
  }

  function canDeleteModule(moduleId: string) {
    return canDeleteModuleForSession(accessContext, moduleId);
  }

  function canViewModuleRecords(moduleId: string) {
    return canViewModuleRecordsForSession(accessContext, moduleId);
  }

  const requireBusinessWorkspaceId = () => {
    if (!currentUser.businessId) {
      addNotification('error', 'This action requires an active business workspace.');
      return null;
    }

    return currentUser.businessId;
  };

  const normalizeEmail = (email: string) => email.trim().toLowerCase();
  const updateSessionUser = (updates: Partial<SessionUser>) => {
    onSessionUserChange({
      ...currentUser,
      ...updates,
    });
  };

  const isBusinessEmailTaken = (email: string, excludedBusinessId?: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return false;
    if (normalizedEmail === adminAccountEmail) return true;

    const businessConflict = businesses.some((business) =>
      normalizeEmail(business.email) === normalizedEmail && business.id !== excludedBusinessId
    );

    if (businessConflict) {
      return true;
    }

    return Object.values(businessWorkspacesById).some((tenantWorkspace) =>
      tenantWorkspace.employees.some((employee) => normalizeEmail(employee.email) === normalizedEmail)
    );
  };

  const isEmployeeEmailTaken = (email: string, excludedEmployeeId?: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return false;
    if (normalizedEmail === adminAccountEmail) return true;

    const businessConflict = businesses.some((business) => normalizeEmail(business.email) === normalizedEmail);
    if (businessConflict) {
      return true;
    }

    return Object.values(businessWorkspacesById).some((tenantWorkspace) =>
      tenantWorkspace.employees.some((employee) =>
        normalizeEmail(employee.email) === normalizedEmail && employee.id !== excludedEmployeeId
      )
    );
  };

  const showPermissionWarning = (moduleId: string, action: string) => {
    addNotification('warning', `${getRoleLabel(currentRole)} cannot ${action} ${getModuleLabel(moduleId)}.`);
  };

  const requireModuleAccess = (moduleId: string, action = 'open') => {
    if (canAccessModuleForSession(accessContext, moduleId)) return true;

    showPermissionWarning(moduleId, action);
    onNavigate('dashboard');
    closeModal();
    return false;
  };

  const requireModuleManagement = (moduleId: string, action = 'change') => {
    if (!requireModuleAccess(moduleId, action)) return false;
    if (canManageModule(moduleId)) return true;

    showPermissionWarning(moduleId, action);
    closeModal();
    return false;
  };

  const requireModuleAction = (
    moduleId: string,
    permissionAction: 'add' | 'edit' | 'delete',
    action: string = permissionAction,
  ) => {
    if (!requireModuleAccess(moduleId, action)) return false;
    if (canPerformModuleAction(moduleId, permissionAction)) return true;

    showPermissionWarning(moduleId, action);
    closeModal();
    return false;
  };

  const requireDeletePermission = (moduleId: string) => {
    if (!requireModuleAccess(moduleId, 'delete from')) return false;
    if (canDeleteModule(moduleId)) return true;

    showPermissionWarning(moduleId, 'delete from');
    closeModal();
    return false;
  };

  const canEmployeeOperateOnDepartment = currentRole !== 'Employee' || Boolean(employeeAssignedDepartment);

  const ensureEmployeeDepartmentAccess = (capability: string) => {
    if (canEmployeeOperateOnDepartment) {
      return true;
    }

    addNotification('warning', `Assign this employee to a department before they can ${capability}.`);
    return false;
  };

  const openModule = (moduleId: string) => {
    if (!requireModuleAccess(moduleId)) return false;

    onNavigate(moduleId);
    return true;
  };

  const addHistoryEvent = (title: string, module: string, status: HistoryEvent['status'] = 'Completed') => {
    dispatch({
      type: 'ADD_HISTORY_EVENT',
      businessId: currentRole === 'Admin' ? undefined : currentUser.businessId,
      payload: {
        title,
        module,
        actor: displayUserName,
        status,
      },
    });
  };

  const renderSummaryCards = (cards: SummaryCardProps[]) => (
    <SummaryGrid cards={cards} />
  );

  const renderBusinessPlanSection = (lockedMode = false) => {
    if (currentRole !== 'Customer' || !currentBusinessAccessState) {
      return null;
    }

    const subscription = currentBusinessAccessState.subscription;
    const workspaceStatusLabel = currentBusinessAccessState.status === 'Active' ? 'Workspace Active' : 'Workspace Locked';

    return (
      <div className="col-12">
        <section className={`panel p-4 business-plan-card ${lockedMode ? 'business-plan-card--locked' : ''}`}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Your Plan</p>
              <h2 className="panel-title">{lockedMode ? 'Renew workspace access' : 'Manage your subscription'}</h2>
              <p className="panel-copy">
                {lockedMode
                  ? 'This business workspace is inactive because the current plan has ended or was cancelled. Renew or switch the plan to unlock the software again.'
                  : 'Review the current plan, switch duration, or cancel it from one place in the dashboard.'}
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <span className={getSubscriptionStatusClass(subscription.status)}>
                {getSubscriptionStatusLabel(subscription.status)}
              </span>
              <span className={`status-chip ${currentBusinessAccessState.status === 'Active' ? 'status-chip--active' : 'status-chip--failed'}`}>
                {workspaceStatusLabel}
              </span>
            </div>
          </div>

          <div className="business-plan-card__grid">
            <div className="business-plan-card__summary">
              <p className="business-plan-card__label">{subscription.plan.label}</p>
              <p className="page-muted mb-0">{subscription.plan.description}</p>
            </div>
            <div className="business-plan-card__metrics">
              <div className="business-plan-metric">
                <span className="business-plan-metric__label">Plan Window</span>
                <strong>{subscription.startDate} to {subscription.endDate}</strong>
              </div>
              <div className="business-plan-metric">
                <span className="business-plan-metric__label">Remaining</span>
                <strong>{subscription.daysRemaining} day{subscription.daysRemaining === 1 ? '' : 's'}</strong>
              </div>
              <div className="business-plan-metric">
                <span className="business-plan-metric__label">Access</span>
                <strong>{lockedMode ? 'Renew required' : subscription.plan.durationLabel}</strong>
              </div>
            </div>
          </div>

          <div className="business-plan-card__actions">
            <button type="button" className="btn-app btn-app-primary" onClick={() => updateUiState('activeModal', 'manage-plan')}>
              {lockedMode ? 'Renew Or Update Plan' : 'Update Plan'}
            </button>
            {!lockedMode ? (
              <button type="button" className="btn-app btn-app-secondary" onClick={handlePlanCancel}>
                Cancel Plan
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  };

  const renderAdminDashboard = () => (
    <div className="row g-4">
      <div className="col-12">
        <section className="hero-panel glass-card">
          <div className="hero-panel__content">
            <p className="eyebrow">Admin Workspace</p>
            <h1 className="hero-panel__headline">Monitor business performance, subscriptions, and renewal.</h1>
            <div className="section-hero__actions">
              <button type="button" className="btn-app btn-app-primary" onClick={() => openModule('customers')}>
                Open Users
              </button>
              <button type="button" className="btn-app btn-app-secondary" onClick={() => openModule('reports')}>
                Open Reports
              </button>
            </div>

            <div className="hero-panel__meta">
              <div className="hero-stat">
                <span className="hero-stat__label">Users</span>
                <span className="hero-stat__value">{businesses.length}</span>
                <span className="hero-stat__hint">Managed from the admin workspace</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__label">Active Plans</span>
                <span className="hero-stat__value">
                  {adminBusinessPlanRows.filter((row) => row.planStatus === 'active' || row.planStatus === 'trial').length}
                </span>
                <span className="hero-stat__hint">Users with software access</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__label">Expiring Soon</span>
                <span className="hero-stat__value">{adminExpiringBusinessRows.length}</span>
                <span className="hero-stat__hint">Need plan follow-up in 14 days</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SummaryGrid cards={adminDashboardSummary} />

      <div className="col-12 col-xl-6 dashboard-balance-col">
        <section className="panel p-4 dashboard-balance-panel">
          <div className="panel-header mb-4">
            <div>
              <p className="eyebrow">Your Business</p>
              <h2 className="panel-title">Workspace directory snapshot</h2>
              <p className="panel-copy">A quick look at the businesses you manage and the plans currently attached to them.</p>
            </div>
            <button type="button" className="btn-app btn-app-secondary" onClick={() => openModule('customers')}>
              Open Directory
            </button>
          </div>
          <div className="dashboard-balance-panel__body">
            <div className="admin-plan-list">
              {adminBusinessPlanRows.slice(0, 6).map((row) => (
                <div key={row.businessId} className="admin-plan-list__item">
                  <div>
                    <p className="admin-plan-list__title">{row.businessName}</p>
                    <p className="admin-plan-list__meta">{row.businessPhone} | {row.planLabel}</p>
                  </div>
                  <div className="d-flex gap-2 flex-wrap justify-content-end">
                    <span className={row.planStatusClass}>{row.planStatusLabel}</span>
                    <span className={row.workspaceStatusClass}>{row.workspaceStatusLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="col-12 col-xl-6 dashboard-balance-col">
        <NotificationCenter
          notifications={notifications}
          onDismiss={handleDismissNotification}
        />
      </div>

      <div className="col-12 col-xl-6 dashboard-balance-col">
        <section className="panel p-4 dashboard-balance-panel">
          <div className="panel-header mb-4">
            <div>
              <p className="eyebrow">Your Plans</p>
              <h2 className="panel-title">Subscription information</h2>
              <p className="panel-copy">See how plan purchases are distributed across the businesses in your admin workspace.</p>
            </div>
          </div>
          <div className="dashboard-balance-panel__body">
            <div className="admin-plan-distribution">
              {adminPlanDistribution.map((plan) => (
                <div key={plan.id} className="admin-plan-distribution__item">
                  <div>
                    <p className="admin-plan-list__title">{plan.label}</p>
                    <p className="admin-plan-list__meta">{plan.durationLabel}</p>
                  </div>
                  <span className="status-chip status-chip--info">{plan.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="col-12 col-xl-6 dashboard-balance-col">
        <section className="panel p-4 dashboard-balance-panel">
          <div className="panel-header mb-4">
            <div>
              <p className="eyebrow">Renewal Watch</p>
              <h2 className="panel-title">Plans expiring soon</h2>
              <p className="panel-copy">Businesses that need renewal attention soon so their workspaces do not get locked unexpectedly.</p>
            </div>
          </div>
          <div className="dashboard-balance-panel__body">
            {adminExpiringBusinessRows.length === 0 ? (
              <div className="notification-empty">
                <p className="mb-0">No business plans are expiring in the next 14 days.</p>
              </div>
            ) : (
              <div className="admin-plan-list">
                {adminExpiringBusinessRows.map((row) => (
                  <div key={row.businessId} className="admin-plan-list__item">
                    <div>
                      <p className="admin-plan-list__title">{row.businessName}</p>
                      <p className="admin-plan-list__meta">{row.planLabel} ends on {row.endDate}</p>
                    </div>
                    <div className="d-flex gap-2 flex-wrap justify-content-end align-items-center">
                      <span className="status-chip status-chip--pending">{row.daysRemaining} day{row.daysRemaining === 1 ? '' : 's'} left</span>
                      <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => handleManageBusinessPlan(row.businessId)}>
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      
      {isAdminPlanFiltersOpen ? renderAdminPlanFilters() : null}

      <div className="col-12">
        <SubscriptionTransactionsTable
          rows={filteredAdminPlanRows}
          onManagePlan={handleManageBusinessPlan}
          onEditBusiness={handleEditCustomer}
          headerAction={
            <div className="table-filter-trigger">
              <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsAdminPlanFiltersOpen((current) => !current)}>
                <FaFilter />
                Filter
              </button>
              {hasActiveAdminPlanFilters ? (
                <span className="status-chip status-chip--info">Filtered</span>
              ) : null}
            </div>
          }
        />
      </div>
    </div>
  );

  const handleDismissNotification = (id: string) => {
    if (currentRole === 'Admin' && id.startsWith('subscription-alert-')) {
      setDismissedGeneratedNotificationIds((current) => [...current, id]);
      return;
    }

    dispatch({ type: 'DISMISS_NOTIFICATION', businessId: currentRole === 'Admin' ? undefined : currentUser.businessId, payload: id });
  };

  const handleEditAccount = (account: Account) => {
    if (!requireModuleAction('accounts', 'edit')) return;

    updateUiState('editingAccount', account);
    updateUiState('activeModal', 'edit-account');
  };

  const handleEditService = (service: Service) => {
    if (!requireModuleAction('services', 'edit')) return;
    if (!ensureEmployeeDepartmentAccess('update services')) return;

    updateUiState('editingService', service);
    updateUiState('activeModal', 'edit-service');
  };

  const handleEditCustomer = (recordId: string) => {
    if (!requireModuleAction('customers', 'edit')) return;

    if (currentRole === 'Admin') {
      const business = businesses.find((item) => item.id === recordId);
      if (!business) return;

      updateUiState('editingBusiness', business);
    } else {
      const customer = workspace.customers.find((item) => item.id === recordId);
      if (!customer) return;

      updateUiState('editingCustomer', customer);
    }
    updateUiState('activeModal', 'edit-customer');
  };

  const handleEditEmployee = (employee: Employee) => {
    if (!requireModuleAction('employee', 'edit')) return;

    updateUiState('editingEmployee', employee);
    updateUiState('activeModal', 'edit-employee');
  };

  const handleEditDepartment = (counter: Counter) => {
    if (!requireModuleAction('departments', 'edit')) return;

    updateUiState('editingDepartment', counter);
    updateUiState('activeModal', 'edit-department');
  };

  const handleEditTransaction = (transaction: Transaction) => {
    if (!requireModuleAction('transactions', 'edit')) return;
    if (!ensureEmployeeDepartmentAccess('edit transactions')) return;

    updateUiState('editingTransaction', transaction);
    updateUiState('activeModal', 'edit-transaction');
  };

  const handleViewCustomerHistory = (recordId: string) => {
    if (currentRole === 'Admin') return;
    if (!requireModuleAccess('customers', 'view')) return;

    const customer = workspace.customers.find((item) => item.id === recordId);
    if (!customer) return;

    updateUiState('selectedCustomerHistory', customer);
    updateUiState('activeModal', 'view-customer-history');
  };

  const handleViewTransaction = (transaction: Transaction) => {
    if (!requireModuleAccess('transactions', 'view')) return;

    updateUiState('selectedTransaction', transaction);
    updateUiState('activeModal', 'view-transaction');
  };

  const handleDownloadReceipt = (transaction: Transaction) => {
    if (!requireModuleAccess('transactions', 'download')) return;

    const receipt = buildTransactionReceiptText(transaction);
    const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${transaction.transactionNumber || 'receipt'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    addNotification('success', `Receipt downloaded for ${transaction.customerName}.`);
  };

  const handlePrintReceipt = (transaction: Transaction) => {
    if (!requireModuleAccess('transactions', 'print')) return;

    const receipt = buildTransactionReceiptText(transaction);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');

    if (!printWindow) {
      addNotification('warning', 'Allow pop-ups to print the receipt.');
      return;
    }

    const escapedReceipt = receipt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n/g, '<br />');

    printWindow.document.write(`
      <html>
        <head>
          <title>${transaction.transactionNumber || 'Receipt'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            .receipt { font-size: 14px; line-height: 1.7; }
          </style>
        </head>
        <body>
          <h1>eNest Service Receipt</h1>
          <div class="receipt">${escapedReceipt}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    addNotification('success', `Receipt opened for printing for ${transaction.customerName}.`);
  };

  const handleCancelTransaction = (transaction: Transaction) => {
    if (!requireModuleAction('transactions', 'edit')) return;
    if (!ensureEmployeeDepartmentAccess('cancel transactions')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    const transition = canTransitionTransactionStatus(transaction.status, 'cancelled');
    if (!transition.allowed) {
      addNotification('warning', transition.error);
      return;
    }

    const confirmed = window.confirm(`Cancel transaction ${transaction.transactionNumber} for ${transaction.customerName}?`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const auditNote = `Cancelled by ${displayUserName} on ${now.split('T')[0]}`;

    dispatch({
      type: 'UPDATE_TRANSACTION',
      businessId,
      payload: {
        ...transaction,
        status: 'cancelled',
        note: transaction.note
          ? `${transaction.note} | ${auditNote}`
          : auditNote,
        cancelledAt: now,
        cancelledBy: displayUserName,
        updatedAt: now,
        updatedBy: displayUserName,
        lastAuditAction: 'cancelled',
      },
    });
    addHistoryEvent(`Transaction ${transaction.transactionNumber} cancelled for ${transaction.customerName}`, 'Transactions', 'Failed');
    addNotification('warning', `Transaction ${transaction.transactionNumber} cancelled.`);
    closeModal();
  };

  const handleViewHistory = (event: HistoryEvent) => {
    if (!requireModuleAccess('history', 'view')) return;

    updateUiState('selectedHistoryEvent', event);
    updateUiState('activeModal', 'view-history');
  };

  const handleViewReport = (report: ReportItem) => {
    if (!requireModuleAccess('reports', 'view')) return;

    updateUiState('selectedReport', report);
    updateUiState('activeModal', 'view-report');
  };

  const handleConfigureOption = (option: AdditionOption) => {
    if (!requireModuleManagement('additions', 'configure')) return;

    updateUiState('selectedOption', option);
    updateUiState('activeModal', 'configure-option');
  };

  const handleEditExpense = (expense: Expense) => {
    if (!requireModuleAction('expense', 'edit')) return;

    updateUiState('editingExpense', expense);
    updateUiState('activeModal', 'edit-expense');
  };

  const handleDeleteRecord = (
    actionType: DeleteActionType,
    id: string,
  ) => {
    const moduleId = deleteActionModuleIds[actionType];
    if (!requireDeletePermission(moduleId)) return;

    const deleteDetails: Record<DeleteActionType, PendingDelete> = {
      DELETE_BUSINESS: {
        actionType,
        id,
        label: businesses.find((business) => business.id === id)?.name || 'this business',
        module: getModuleLabel('customers'),
      },
      DELETE_ACCOUNT: {
        actionType,
        id,
        label: accounts.find((account) => account.id === id)?.accountHolder || 'this account',
        module: getModuleLabel('accounts'),
      },
      DELETE_SERVICE: {
        actionType,
        id,
        label: services.find((service) => service.id === id)?.name || 'this service',
        module: getModuleLabel('services'),
      },
      DELETE_CUSTOMER: {
        actionType,
        id,
        label: workspace.customers.find((customer) => customer.id === id)?.name || 'this customer',
        module: customerEntityPlural,
      },
      DELETE_EMPLOYEE: {
        actionType,
        id,
        label: employees.find((employee) => employee.id === id)?.name || 'this employee',
        module: getModuleLabel('employee'),
      },
      DELETE_COUNTER: {
        actionType,
        id,
        label: counters.find((counter) => counter.id === id)?.name || 'this department',
        module: getModuleLabel('departments'),
      },
      DELETE_EXPENSE: {
        actionType,
        id,
        label: expenses.find((expense) => expense.id === id)?.title || 'this expense',
        module: getModuleLabel('expense'),
      },
      DELETE_TRANSACTION: {
        actionType,
        id,
        label: transactionHistory.find((transaction) => transaction.id === id)?.transactionNumber || 'this transaction',
        module: getModuleLabel('transactions'),
      },
      DELETE_HISTORY_EVENT: {
        actionType,
        id,
        label: historyEvents.find((event) => event.id === id)?.title || 'this history record',
        module: getModuleLabel('history'),
      },
      DELETE_REPORT: {
        actionType,
        id,
        label: reports.find((report) => report.id === id)?.name || 'this report',
        module: getModuleLabel('reports'),
      },
      DELETE_ADDITION_OPTION: {
        actionType,
        id,
        label: additionOptions.find((option) => option.id === id)?.title || 'this setting',
        module: getModuleLabel('additions'),
      },
    };

    updateUiState('pendingDelete', deleteDetails[actionType]);
    updateUiState('transactionDeleteReason', '');
    updateUiState('activeModal', 'confirm-delete');
  };

  const handleDeleteService = (id: string) => {
    handleDeleteRecord('DELETE_SERVICE', id);
  };

  const confirmDeleteRecord = () => {
    if (!pendingDelete) return;
    if (!requireDeletePermission(deleteActionModuleIds[pendingDelete.actionType])) return;

    if (pendingDelete.actionType === 'DELETE_BUSINESS') {
      dispatch({ type: 'DELETE_BUSINESS', payload: pendingDelete.id });
    } else if (pendingDelete.actionType === 'DELETE_HISTORY_EVENT') {
      dispatch({ type: 'DELETE_HISTORY_EVENT', businessId: currentRole === 'Admin' ? undefined : currentUser.businessId, payload: pendingDelete.id });
    } else if (pendingDelete.actionType === 'DELETE_REPORT') {
      dispatch({ type: 'DELETE_REPORT', businessId: currentRole === 'Admin' ? undefined : currentUser.businessId, payload: pendingDelete.id });
    } else if (pendingDelete.actionType === 'DELETE_ADDITION_OPTION') {
      dispatch({ type: 'DELETE_ADDITION_OPTION', payload: pendingDelete.id });
    } else if (pendingDelete.actionType === 'DELETE_TRANSACTION') {
      const businessId = requireBusinessWorkspaceId();
      if (!businessId) return;

      const deleteReason = transactionDeleteReason.trim();
      if (!deleteReason) {
        addNotification('warning', 'Enter a reason before archiving this transaction.');
        return;
      }

      dispatch({
        type: 'DELETE_TRANSACTION',
        businessId,
        payload: {
          id: pendingDelete.id,
          deletedBy: displayUserName,
          deleteReason,
        },
      });
      addNotification('success', `${pendingDelete.label} archived successfully.`);
      addHistoryEvent(`${pendingDelete.label} archived`, pendingDelete.module);
      closeModal();
      return;
    } else {
      const businessId = requireBusinessWorkspaceId();
      if (!businessId) return;

      dispatch({
        type: pendingDelete.actionType,
        businessId,
        payload: pendingDelete.id,
      } as Extract<
        Parameters<typeof dispatch>[0],
        { businessId: string }
      >);
    }
    addNotification('success', `${pendingDelete.label} deleted successfully.`);
    addHistoryEvent(`${pendingDelete.label} deleted`, pendingDelete.module);
    closeModal();
  };

  const createDailyReportPayload = (): Omit<ReportItem, 'id' | 'date'> => {
    if (currentRole === 'Admin') {
      return {
        name: `Admin Activity ${todayDate}`,
        type: 'Admin Summary',
        owner: displayUserName,
        status: 'Ready',
      };
    }

    return {
      name: `Daily Closing ${todayDate}`,
      type: 'Daily Closing',
      owner: displayUserName,
      status: 'Ready',
      summary: todayReportSummary,
    };
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-transaction':
        if (!requireModuleManagement('transactions', 'start')) return;
        if (!ensureEmployeeDepartmentAccess('create transactions')) return;

        startWorkflowWithDraft({}, {
          notice: 'New transaction workflow is ready.',
        });
        break;
      case 'repeat-customer': {
        if (!requireModuleManagement('transactions', 'repeat')) return;
        if (!ensureEmployeeDepartmentAccess('repeat transactions')) return;
        if (transactionHistory.length === 0) {
          addNotification('warning', 'No previous transaction found to repeat.');
          return;
        }

        const latestTransaction = transactionHistory[0];
        const latestCustomer = workspace.customers.find((customer) => customer.id === latestTransaction.customerId);

        startWorkflowWithDraft({
          customerId: latestTransaction.customerId,
          customerName: latestTransaction.customerName,
          customerPhone: latestTransaction.customerPhone,
          customerEmail: latestCustomer?.email,
          serviceId: latestTransaction.serviceId,
          totalAmount: latestTransaction.totalAmount,
          paidAmount: latestTransaction.totalAmount,
          paymentMode: latestTransaction.paymentMode,
          status: 'completed',
          note: latestTransaction.note,
        }, {
          departmentId: latestTransaction.departmentId,
          notice: `Latest transaction loaded for ${latestTransaction.customerName}. Review it and save when ready.`,
        });
        break;
      }
      case 'daily-report':
      case 'generate-report':
        if (!requireModuleManagement('reports', 'generate')) return;

        dispatch({
          type: 'ADD_REPORT',
          businessId: currentRole === 'Admin' ? undefined : currentUser.businessId,
          payload: createDailyReportPayload(),
        });
        addHistoryEvent('Daily report generated', 'Reports');
        addNotification('success', 'Daily report generated successfully.');
        openModule('reports');
        break;
      case 'favorites':
        if (!requireModuleAccess('services', 'view')) return;

        updateUiState('activeModal', 'favorites');
        break;
      case 'add-service':
        if (!requireModuleAction('services', 'add')) return;
        if (!ensureEmployeeDepartmentAccess('create services')) return;

        openModule('services');
        updateUiState('activeModal', 'add-service');
        break;
      case 'add-customer':
        if (!requireModuleAction('customers', 'add')) return;

        openModule('customers');
        updateUiState('activeModal', 'add-customer');
        break;
      case 'add-account':
        if (!requireModuleAction('accounts', 'add')) return;

        openModule('accounts');
        updateUiState('activeModal', 'add-account');
        break;
      case 'add-employee':
        if (!requireModuleAction('employee', 'add')) return;

        openModule('employee');
        updateUiState('activeModal', 'add-employee');
        break;
      case 'add-department':
        if (!requireModuleAction('departments', 'add')) return;

        openModule('departments');
        updateUiState('activeModal', 'add-department');
        break;
      case 'add-expense':
        if (!requireModuleAction('expense', 'add')) return;

        openModule('expense');
        updateUiState('activeModal', 'add-expense');
        break;
      case 'export-transactions':
        if (!requireModuleManagement('transactions', 'export')) return;

        exportTransactions();
        break;
      case 'filter-history':
        if (!requireModuleAccess('history', 'view')) return;

        setHistoryStatusFilter((current) => current === 'All' ? 'Failed' : 'All');
        addNotification('info', historyStatusFilter === 'All' ? 'Showing failed history records.' : 'Showing all history records.');
        break;
      case 'update-options':
        if (!requireModuleManagement('additions', 'update')) return;

        openModule('additions');
        updateUiState('activeModal', 'manage-options');
        break;
      default:
        addNotification('info', 'Action is ready.');
    }
  };

  const exportTransactions = () => {
    if (!requireModuleManagement('transactions', 'export')) return;

    const header = ['Transaction No.', 'Customer', 'Service', 'Payment Mode', 'Total Amount', 'Paid Amount', 'Due Amount', 'Status', 'Department', 'Handled By', 'Date'];
    const rows = filteredTransactionRecords.map((transaction) => [
      transaction.transactionNumber,
      transaction.customerName,
      transaction.service,
      transaction.paymentMode.toUpperCase(),
      String(transaction.totalAmount),
      String(transaction.paidAmount),
      String(transaction.dueAmount),
      transaction.status,
      transaction.departmentName,
      transaction.handledByName,
      transaction.date,
    ]);
    const csv = buildCsv([header, ...rows]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
    addHistoryEvent('Transactions exported', 'Reports');
    addNotification('success', 'Transactions exported as CSV.');
  };

  const handleServiceSubmit = (values: ServiceFormValues) => {
    if (!requireModuleAction('services', editingService ? 'edit' : 'add')) return;
    if (!ensureEmployeeDepartmentAccess(editingService ? 'update services' : 'create services')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    if (!values.departmentId || !values.departmentName) {
      addNotification('warning', 'Choose the department for this service before saving.');
      return;
    }

    if (editingService) {
      dispatch({ type: 'UPDATE_SERVICE', businessId, payload: { ...values, id: editingService.id } });
      addHistoryEvent(`${values.name} service updated`, 'Services');
      addNotification('success', `${values.name} updated for ${values.departmentName}.`);
    } else {
      dispatch({ type: 'ADD_SERVICE', businessId, payload: values });
      addHistoryEvent(`${values.name} service added`, 'Services');
      addNotification('success', `${values.name} added for ${values.departmentName}.`);
    }
    closeModal();
  };

  const handleBusinessSubmit = async (values: BusinessFormValues) => {
    if (!requireModuleAction('customers', editingBusiness ? 'edit' : 'add')) return;

    if (Object.values(values.permissions).every((enabled) => enabled === 0)) {
      addNotification('warning', 'Select at least one permission before saving the business.');
      return;
    }

    if (isBusinessEmailTaken(values.email, editingBusiness?.id)) {
      addNotification('error', 'That business email is already assigned to another login.');
      return;
    }

    if (currentRole === 'Admin' && !editingBusiness) {
      const privilegesPayload = JSON.stringify(buildRoleTemplatePrivilegesPayload(values.permissions));
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.email,
          password: values.password,
          fullname: values.name,
          role: '2',
          email_id: values.email,
          contact_no: values.phone,
          role_template_id: values.roleTemplateId,
          permission: privilegesPayload,
          privileges: privilegesPayload,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        addNotification('error', result?.message || 'Unable to create business.');
        return;
      }

      addHistoryEvent(`${values.name} business added`, 'Customers');
      addNotification('success', 'Business added successfully.');
      reloadBackendBusinesses();
      closeModal();
      return;
    }

    if (editingBusiness) {
      dispatch({
        type: 'UPDATE_BUSINESS',
        payload: {
          ...values,
          id: editingBusiness.id,
          onboardingCompleted: editingBusiness.onboardingCompleted,
          onboardingStep: editingBusiness.onboardingStep,
        },
      });
      addHistoryEvent(`${values.name} business updated`, 'Customers');
      addNotification('success', 'Business updated successfully.');
    } else {
      dispatch({
        type: 'ADD_BUSINESS',
        payload: {
          ...values,
          onboardingCompleted: false,
          onboardingStep: 'welcome',
        },
      });
      addHistoryEvent(`${values.name} business added`, 'Customers');
      addNotification('success', 'Business added successfully.');
    }
    closeModal();
  };

  const persistBusinessProfileUpdate = (targetBusiness: Business, updates: Partial<Business>) => {
    dispatch({
      type: 'UPDATE_BUSINESS',
      payload: {
        ...targetBusiness,
        ...updates,
      },
    });
  };

  const updateCurrentBusinessProfile = (updates: Partial<Business>) => {
    if (!currentBusiness) {
      return;
    }

    persistBusinessProfileUpdate(currentBusiness, updates);
  };

  const handleAdminProfileSave = (values: { name: string; email: string; password?: string }) => {
    const nextName = values.name.trim();
    const nextEmail = normalizeEmail(values.email);
    if (!nextName || !nextEmail) {
      addNotification('error', 'Name and email are required to update the profile.');
      return;
    }

    const businessConflict = businesses.some((business) => normalizeEmail(business.email) === nextEmail);
    const employeeConflict = Object.values(businessWorkspacesById).some((tenantWorkspace) =>
      tenantWorkspace.employees.some((employee) => normalizeEmail(employee.email) === nextEmail)
    );

    if (nextEmail !== adminAccountEmail && (businessConflict || employeeConflict)) {
      addNotification('error', 'That email is already assigned to another login.');
      return;
    }

    updateSessionUser({
      name: nextName,
      email: nextEmail,
    });
    addHistoryEvent(`${nextName} profile updated`, 'Profile');
    addNotification('success', 'Profile updated successfully.');
  };

  const handleBusinessProfileSave = (values: { name: string; phone: string; email: string; password?: string }) => {
    if (!currentBusiness) {
      addNotification('error', 'Your business profile is unavailable right now.');
      return;
    }

    const nextName = values.name.trim();
    const nextPhone = values.phone.trim();
    const nextEmail = normalizeEmail(values.email);
    if (!nextName || !nextPhone || !nextEmail) {
      addNotification('error', 'Name, phone, and email are required to update the profile.');
      return;
    }

    if (isBusinessEmailTaken(nextEmail, currentBusiness.id)) {
      addNotification('error', 'That email is already assigned to another login.');
      return;
    }

    persistBusinessProfileUpdate(currentBusiness, {
      name: nextName,
      phone: nextPhone,
      email: nextEmail,
      password: values.password || currentBusiness.password,
    });
    updateSessionUser({
      name: nextName,
      email: nextEmail,
    });
    addHistoryEvent(`${nextName} profile updated`, 'Profile');
    addNotification('success', 'Profile updated successfully.');
  };

  const handleEmployeeProfileSave = (values: { name: string; phone: string; email: string; password?: string }) => {
    const businessId = requireBusinessWorkspaceId();
    if (!businessId || !currentEmployee) {
      addNotification('error', 'Your employee profile is unavailable right now.');
      return;
    }

    const nextName = values.name.trim();
    const nextPhone = values.phone.trim();
    const nextEmail = normalizeEmail(values.email);
    if (!nextName || !nextPhone || !nextEmail) {
      addNotification('error', 'Name, phone, and email are required to update the profile.');
      return;
    }

    if (isEmployeeEmailTaken(nextEmail, currentEmployee.id)) {
      addNotification('error', 'That email is already assigned to another login.');
      return;
    }

    dispatch({
      type: 'UPDATE_EMPLOYEE',
      businessId,
      payload: {
        ...currentEmployee,
        name: nextName,
        phone: nextPhone,
        email: nextEmail,
        password: values.password || currentEmployee.password,
      },
    });
    updateSessionUser({
      name: nextName,
      email: nextEmail,
    });
    addHistoryEvent(`${nextName} profile updated`, 'Profile');
    addNotification('success', 'Profile updated successfully.');
  };

  const handlePlanUpdate = (subscription: BusinessSubscription) => {
    const targetBusiness = currentRole === 'Customer' ? currentBusiness : selectedPlanBusiness;
    if (!targetBusiness) {
      return;
    }

    const nextPlan = getBusinessSubscriptionPlan(subscription.planId);
    persistBusinessProfileUpdate(targetBusiness, {
      subscription,
      status: 'Active',
    });
    addHistoryEvent(`${targetBusiness.name || 'Business'} plan updated to ${nextPlan.label}`, 'Dashboard');
    addNotification('success', `${nextPlan.label} is active until ${subscription.endDate}.`);
    closeModal();
    onNavigate('dashboard');
  };

  const handlePlanCancel = () => {
    const targetBusiness = currentRole === 'Customer' ? currentBusiness : selectedPlanBusiness;
    if (!targetBusiness) {
      addNotification('error', 'The selected plan details are no longer available.');
      closeModal();
      onNavigate('dashboard');
      return;
    }
    const targetAccessState = getBusinessAccessState(targetBusiness);
    if (!targetAccessState) {
      addNotification('error', 'The selected plan details are no longer available.');
      closeModal();
      onNavigate('dashboard');
      return;
    }

    persistBusinessProfileUpdate(targetBusiness, {
      subscription: {
        planId: targetAccessState.subscription.planId,
        startDate: targetAccessState.subscription.startDate,
        endDate: targetAccessState.subscription.endDate,
        status: 'cancelled',
        cancelledAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      },
      status: 'Inactive',
    });
    addHistoryEvent(`${targetBusiness.name || 'Business'} plan cancelled`, 'Dashboard', 'Pending');
    addNotification('warning', 'The plan has been cancelled. Renew it to restore full workspace access.');
    closeModal();
    onNavigate('dashboard');
  };

  const handleManageBusinessPlan = (businessId: string) => {
    if (!requireModuleAction('customers', 'edit', 'manage plans for')) return;

    const business = businesses.find((item) => item.id === businessId);
    if (!business) return;

    updateUiState('selectedPlanBusiness', business);
    updateUiState('activeModal', 'manage-plan');
  };

  const handleOnboardingBusinessNameSave = (name: string) => {
    updateCurrentBusinessProfile({
      name,
      onboardingCompleted: false,
      onboardingStep: getNextOnboardingStep('welcome', canAccessOnboardingServices),
    });
  };

  const handleOnboardingDepartmentSave = (values: { name: string; code: string }) => {
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    const primaryAccountId = accounts[0]?.id;
    const departmentPayload: DepartmentFormValues = {
      name: values.name,
      code: values.code,
      linkedAccountIds: primaryAccountId ? [primaryAccountId] : [],
      defaultAccountId: primaryAccountId,
      linkedAccountId: primaryAccountId,
      openingBalance: 0,
      currentBalance: 0,
      status: 'Active',
    };

    dispatch({
      type: 'ADD_COUNTER',
      businessId,
      payload: departmentPayload,
    });
  };

  const handleOnboardingAdvanceDepartments = () => {
    updateCurrentBusinessProfile({
      onboardingCompleted: false,
      onboardingStep: getNextOnboardingStep('departments', canAccessOnboardingServices),
    });
  };

  const handleOnboardingAccountSave = (values: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
  }) => {
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    const newAccountId = createRecordId();
    dispatch({
      type: 'ADD_ACCOUNT',
      businessId,
      payload: {
        id: newAccountId,
        ...values,
        openingBalance: 0,
        currentBalance: 0,
        status: 'Active',
      },
    });

    counters.forEach((counter) => {
      const nextLinkedAccountIds = Array.from(new Set([
        ...getDepartmentLinkedAccountIds(counter),
        newAccountId,
      ]));

      dispatch({
        type: 'UPDATE_COUNTER',
        businessId,
        payload: {
          ...counter,
          linkedAccountIds: nextLinkedAccountIds,
          defaultAccountId: counter.defaultAccountId || newAccountId,
          linkedAccountId: counter.linkedAccountId || newAccountId,
        },
      });
    });
  };

  const handleOnboardingAdvanceAccounts = () => {
    updateCurrentBusinessProfile({
      onboardingCompleted: false,
      onboardingStep: getNextOnboardingStep('accounts', canAccessOnboardingServices),
    });
  };

  const handleOnboardingServiceSave = (values: {
    departmentId: string;
    departmentName: string;
    name: string;
    category: string;
    description: string;
    price: number;
  }) => {
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    dispatch({
      type: 'ADD_SERVICE',
      businessId,
      payload: {
        ...values,
        status: 'Active',
      },
    });
  };

  const handleOnboardingAdvanceServices = () => {
    updateCurrentBusinessProfile({
      onboardingCompleted: false,
      onboardingStep: getNextOnboardingStep('services', canAccessOnboardingServices),
    });
  };

  const completeOnboarding = () => {
    updateCurrentBusinessProfile({
      onboardingCompleted: true,
      onboardingStep: 'dashboard',
    });
    addHistoryEvent('Business setup completed', 'Dashboard');
    addNotification('success', 'Workspace setup completed. Welcome to your dashboard.');
    onNavigate('dashboard');
  };

  const handleOnboardingCustomerImport = (
    importedCustomers: Array<{ name: string; phone: string; email?: string }>,
  ) => {
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    const seenPhones = new Set<string>(
      workspace.customers.map((customer) => customer.phone.trim()),
    );
    let importedCount = 0;

    importedCustomers.forEach((customer) => {
      const normalizedPhone = customer.phone.trim();
      if (!normalizedPhone || seenPhones.has(normalizedPhone)) {
        return;
      }

      seenPhones.add(normalizedPhone);
      dispatch({
        type: 'ADD_CUSTOMER',
        businessId,
        payload: {
          id: createRecordId(),
          name: customer.name.trim(),
          phone: normalizedPhone,
          email: customer.email?.trim().toLowerCase() || '',
          status: 'Active',
          joinedDate: new Date().toISOString().split('T')[0],
        },
      });
      importedCount += 1;
    });

    if (importedCount === 0 && workspace.customers.length > 0) {
      addNotification('info', 'No new customers were added from the uploaded data.');
    }

    completeOnboarding();
  };

  const handleOnboardingSkipCustomers = () => {
    completeOnboarding();
  };

  const handleCustomerSubmit = (values: CustomerFormValues) => {
    if (!requireModuleAction('customers', editingCustomer ? 'edit' : 'add')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    if (editingCustomer) {
      dispatch({ type: 'UPDATE_CUSTOMER', businessId, payload: { ...values, id: editingCustomer.id } });
      addHistoryEvent(`${values.name} customer updated`, 'Customers');
      addNotification('success', 'Customer updated successfully.');
    } else {
      dispatch({ type: 'ADD_CUSTOMER', businessId, payload: values });
      addHistoryEvent(`${values.name} customer added`, 'Customers');
      addNotification('success', 'Customer added successfully.');
    }
    closeModal();
  };

  const handleEmployeeSubmit = (values: EmployeeFormValues) => {
    if (!requireModuleAction('employee', editingEmployee ? 'edit' : 'add')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    if (!values.departmentId) {
      addNotification('warning', 'Assign a department before saving the employee.');
      return;
    }

    if (isEmployeeEmailTaken(values.email, editingEmployee?.id)) {
      addNotification('error', 'That employee email is already assigned to another login.');
      return;
    }

    if (editingEmployee) {
      dispatch({ type: 'UPDATE_EMPLOYEE', businessId, payload: { ...values, id: editingEmployee.id } });
      addHistoryEvent(`${values.name} employee updated`, 'Employees');
      addNotification('success', 'Employee updated successfully.');
    } else {
      dispatch({ type: 'ADD_EMPLOYEE', businessId, payload: values });
      addHistoryEvent(`${values.name} employee added`, 'Employees');
      addNotification('success', 'Employee added successfully.');
    }
    closeModal();
  };

  const handleDepartmentSubmit = (values: DepartmentFormValues) => {
    if (!requireModuleAction('departments', editingDepartment ? 'edit' : 'add')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    if (editingDepartment) {
      dispatch({ type: 'UPDATE_COUNTER', businessId, payload: { ...values, id: editingDepartment.id } });
      addHistoryEvent(`${values.name} department updated`, 'Department');
      addNotification('success', 'Department updated successfully.');
    } else {
      dispatch({ type: 'ADD_COUNTER', businessId, payload: values });
      addHistoryEvent(`${values.name} department added`, 'Department');
      addNotification('success', 'Department added successfully.');
    }
    closeModal();
  };

  const handleAccountSubmit = (values: AccountFormValues) => {
    if (!requireModuleAction('accounts', editingAccount ? 'edit' : 'add')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    if (editingAccount) {
      dispatch({ type: 'UPDATE_ACCOUNT', businessId, payload: { ...values, id: editingAccount.id, date: editingAccount.date } });
      addHistoryEvent(`${values.accountHolder} account updated`, 'Accounts');
      addNotification('success', 'Account updated successfully.');
    } else {
      dispatch({ type: 'ADD_ACCOUNT', businessId, payload: values });
      addHistoryEvent(`${values.accountHolder} account added`, 'Accounts');
      addNotification('success', 'Account added successfully.');
    }
    closeModal();
  };

  const handleExpenseSubmit = (values: ExpenseFormValues) => {
    if (!requireModuleAction('expense', editingExpense ? 'edit' : 'add')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    if (editingExpense) {
      dispatch({ type: 'UPDATE_EXPENSE', businessId, payload: { ...values, id: editingExpense.id } });
      addHistoryEvent(`${values.title} expense updated`, 'Expense');
      addNotification('success', 'Expense updated successfully.');
    } else {
      dispatch({ type: 'ADD_EXPENSE', businessId, payload: values });
      addHistoryEvent(`${values.title} expense added`, 'Expense');
      addNotification('success', 'Expense added successfully.');
    }
    closeModal();
  };

  const handleTransactionSubmit = (values: TransactionEditorValues) => {
    if (!editingTransaction) return;
    if (!requireModuleAction('transactions', 'edit')) return;
    const businessId = requireBusinessWorkspaceId();
    if (!businessId) return;

    const amountErrors = validateTransactionAmounts({
      totalAmount: values.totalAmount,
      paidAmount: values.paidAmount,
      dueAmount: values.dueAmount,
      status: values.status,
    });
    if (amountErrors.length > 0) {
      addNotification('warning', amountErrors[0]);
      return;
    }

    const selectedAccount = values.accountId
      ? accounts.find((account) => account.id === values.accountId) || null
      : null;
    const selectedDepartment = values.departmentId
      ? counters.find((counter) => counter.id === values.departmentId) || null
      : null;
    const accountErrors = validateTransactionAccountSelection({
      paymentMode: values.paymentMode,
      accountId: values.accountId,
      paymentDetails: values.paymentDetails,
      selectedAccount,
      selectedDepartment,
    });
    if (accountErrors.length > 0) {
      addNotification('warning', accountErrors[0]);
      return;
    }

    const transition = canTransitionTransactionStatus(editingTransaction.status, values.status);
    if (!transition.allowed) {
      addNotification('warning', transition.error);
      return;
    }

    const now = new Date().toISOString();

    const updatedTransaction: Transaction = {
      ...editingTransaction,
      ...values,
      updatedAt: now,
      updatedBy: displayUserName,
      lastAuditAction: 'updated',
    };

    if (editingTransaction.status !== updatedTransaction.status) {
      if (updatedTransaction.status === 'cancelled') {
        updatedTransaction.cancelledAt = now;
        updatedTransaction.cancelledBy = displayUserName;
        updatedTransaction.lastAuditAction = 'cancelled';
      }

      if (updatedTransaction.status === 'refunded') {
        updatedTransaction.refundedAt = now;
        updatedTransaction.refundedBy = displayUserName;
        updatedTransaction.refundReason = values.note?.trim() || editingTransaction.refundReason || 'Refund processed during transaction update.';
        updatedTransaction.lastAuditAction = 'refunded';
      }
    }

    dispatch({
      type: 'UPDATE_TRANSACTION',
      businessId,
      payload: updatedTransaction,
    });
    if (editingTransaction.status !== updatedTransaction.status) {
      const historyStatus = updatedTransaction.status === 'pending'
        ? 'Pending'
        : updatedTransaction.status === 'cancelled' || updatedTransaction.status === 'refunded'
          ? 'Failed'
          : 'Completed';

      addHistoryEvent(
        `Transaction ${updatedTransaction.transactionNumber} changed from ${editingTransaction.status} to ${updatedTransaction.status}`,
        'Transactions',
        historyStatus,
      );
    } else {
      addHistoryEvent(`${updatedTransaction.transactionNumber} updated for ${updatedTransaction.customerName}`, 'Transactions');
    }

    addNotification('success', `Transaction updated for ${updatedTransaction.customerName}.`);
    closeModal();
  };

  const handleToggleOption = () => {
    if (!selectedOption) {
      addNotification('error', 'The selected setting is no longer available.');
      closeModal();
      return;
    }
    if (!requireModuleManagement('additions', 'configure')) return;

    const nextStatus = selectedOption.status === 'Enabled' ? 'Disabled' : 'Enabled';
    dispatch({
      type: 'UPDATE_ADDITION_OPTION',
      payload: {
        ...selectedOption,
        status: nextStatus,
      },
    });
    addHistoryEvent(`${selectedOption.title} ${nextStatus.toLowerCase()}`, 'System Settings');
    addNotification('success', `${selectedOption.title} is now ${nextStatus}.`);
    closeModal();
  };

  const toggleFavoriteService = (serviceId: string) => {
    updateUiState('favoriteServiceIds', (current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  const renderPermissionDenied = (moduleId: string) => {
    const moduleUi = getModuleUi(moduleId);

    return (
      <div className="row g-4">
        <div className="col-12">
          <PermissionState
            eyebrow={moduleUi?.label || 'Access Restricted'}
            title={moduleUi?.permissionTitle || `${getRoleLabel(currentRole)} cannot open ${getModuleLabel(moduleId)}`}
            description={moduleUi?.permissionDescription || 'This page is protected by the role and permission rules for the current workspace.'}
            action={{
              label: 'Go To Dashboard',
              onClick: () => openModule('dashboard'),
            }}
          />
        </div>
      </div>
    );
  };

  const renderCustomerRoutePermissionState = () => {
    const message = currentRole === 'Admin'
      ? 'The admin workspace only supports the user directory on customer routes. Open the directory list to keep working in this section.'
      : customerPageOptions.length > 0
        ? 'This URL points to a customer view your current permissions do not allow. Choose one of the customer pages available to your role.'
        : 'This business can still add customers, but the customer list views stay hidden until their permissions are turned on.';

    return (
      <PermissionState
        eyebrow="Customer Route"
        title={requestedCustomerPageCopy.permissionTitle}
        description={message}
        action={customerPageOptions.length === 0 ? {
          label: 'Go To Dashboard',
          onClick: () => openModule('dashboard'),
        } : undefined}
      >
        {customerPageOptions.length > 0 ? (
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            {customerPageOptions.map((option) => (
              <Link
                key={option.id}
                href={getCustomerWorkspacePath(option.id)}
                className="btn-app btn-app-secondary"
              >
                {option.label}
              </Link>
            ))}
          </div>
        ) : null}
      </PermissionState>
    );
  };

  const renderSearchResults = () => {
    const totalResults = searchMatches.services.length + searchMatches.customers.length + searchMatches.transactions.length;

    return (
      <div className="row g-4">
        <div className="col-12">
          <div className="panel p-4">
              <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                <div>
                  <p className="eyebrow mb-2">Global Search</p>
                  <h2 className="h4 mb-1 fw-semibold">Results for <span className="text-primary">{searchQuery}</span></h2>
                  <p className="page-muted mb-0">Found {totalResults} matching records in modules your role can access.</p>
                </div>
                <button type="button" className="btn-app btn-app-secondary align-self-start" onClick={() => setSearchQuery('')}>
                  Clear Search
                </button>
              </div>
          </div>
        </div>

        {totalResults === 0 ? (
          <div className="col-12">
            <EmptyState
              eyebrow="Global Search"
              title={`No results for "${searchQuery}"`}
              description="Try a customer name, transaction number, phone number, or service name."
              action={{
                label: 'Clear Search',
                onClick: () => setSearchQuery(''),
                variant: 'secondary',
              }}
            />
          </div>
        ) : null}

        {searchMatches.services.length > 0 && (
          <div className="col-12 col-xl-4">
            <h3 className="h5 fw-semibold mb-3">Services</h3>
            <div className="d-flex flex-column gap-2">
              {searchMatches.services.map((service) => (
                <button key={service.id} type="button" className="search-result-button" onClick={() => { openModule('services'); setSearchQuery(''); }}>
                  <span className="fw-semibold d-block">{service.name}</span>
                  <span className="page-muted small">{service.category} | Rs. {service.price.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {searchMatches.customers.length > 0 && (
          <div className="col-12 col-xl-4">
            <h3 className="h5 fw-semibold mb-3">{customerEntityPlural}</h3>
            <div className="d-flex flex-column gap-2">
              {searchMatches.customers.map((customer) => (
                <button key={customer.id} type="button" className="search-result-button" onClick={() => { openModule('customers'); setSearchQuery(''); }}>
                  <span className="fw-semibold d-block">{customer.name}</span>
                  <span className="page-muted small">{customer.phone} | {customer.email || 'No email'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {searchMatches.transactions.length > 0 && (
          <div className="col-12 col-xl-4">
            <h3 className="h5 fw-semibold mb-3">Transactions</h3>
            <div className="d-flex flex-column gap-2">
              {searchMatches.transactions.map((transaction) => (
                <button key={transaction.id} type="button" className="search-result-button" onClick={() => { openModule('transactions'); setSearchQuery(''); }}>
                  <span className="fw-semibold d-block">{transaction.customerName}</span>
                  <span className="page-muted small">{transaction.service} | {transaction.status}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getModalPermission = (modal: Exclude<ModalMode, null>) => {
    if (modal === 'confirm-delete') {
      return pendingDelete
        ? { moduleId: deleteActionModuleIds[pendingDelete.actionType], permission: 'delete' as const }
        : null;
    }

    if (modal === 'manage-plan' || modal === 'confirm-plan-cancel') {
      return currentRole === 'Admin'
        ? { moduleId: 'customers', permission: 'edit' as const }
        : { moduleId: 'dashboard', permission: 'access' as const };
    }

    if (modal === 'confirm-option-change') {
      return { moduleId: 'additions', permission: 'edit' as const };
    }

    const modalPermissions: Partial<Record<Exclude<ModalMode, null>, { moduleId: string; permission: 'access' | 'add' | 'edit' | 'delete' }>> = {
      favorites: { moduleId: 'services', permission: 'access' },
      'add-service': { moduleId: 'services', permission: 'add' },
      'edit-service': { moduleId: 'services', permission: 'edit' },
      'add-customer': { moduleId: 'customers', permission: 'add' },
      'edit-customer': { moduleId: 'customers', permission: 'edit' },
      'add-employee': { moduleId: 'employee', permission: 'add' },
      'edit-employee': { moduleId: 'employee', permission: 'edit' },
      'add-department': { moduleId: 'departments', permission: 'add' },
      'edit-department': { moduleId: 'departments', permission: 'edit' },
      'add-account': { moduleId: 'accounts', permission: 'add' },
      'edit-account': { moduleId: 'accounts', permission: 'edit' },
      'add-expense': { moduleId: 'expense', permission: 'add' },
      'edit-expense': { moduleId: 'expense', permission: 'edit' },
      'edit-transaction': { moduleId: 'transactions', permission: 'edit' },
      'view-transaction': { moduleId: 'transactions', permission: 'access' },
      'view-customer-history': { moduleId: 'customers', permission: 'access' },
      'view-history': { moduleId: 'history', permission: 'access' },
      'view-report': { moduleId: 'reports', permission: 'access' },
      'configure-option': { moduleId: 'additions', permission: 'edit' },
      'manage-options': { moduleId: 'additions', permission: 'edit' },
    };

    return modalPermissions[modal] || null;
  };

  const canUseModal = (modal: Exclude<ModalMode, null>) => {
    const requiredPermission = getModalPermission(modal);
    if (!requiredPermission) return true;

    const hasModuleAccess = canAccessModuleForSession(accessContext, requiredPermission.moduleId);
    if (requiredPermission.permission === 'access') return hasModuleAccess;
    if (requiredPermission.permission === 'delete') return hasModuleAccess && canDeleteModule(requiredPermission.moduleId);
    return hasModuleAccess && canPerformModuleAction(requiredPermission.moduleId, requiredPermission.permission);
  };

  const renderModal = () => {
    if (!activeModal) return null;

    if (!canUseModal(activeModal)) {
      return (
        <ActionModal title="Access Restricted" eyebrow={getRoleLabel(currentRole)} onClose={closeModal}>
          <p className="page-muted mb-0">
            Your signed-in role cannot use this action. Return to the dashboard or contact an admin.
          </p>
        </ActionModal>
      );
    }

    if (activeModal === 'notifications') {
      return (
        <ActionModal title="Notification Center" onClose={closeModal}>
          <NotificationCenter notifications={notifications} onDismiss={handleDismissNotification} />
        </ActionModal>
      );
    }

    if (activeModal === 'favorites') {
      return (
        <ActionModal title="Favorite Services" onClose={closeModal}>
          <div className="d-flex flex-column gap-3">
            {favoriteServices.length === 0 ? (
              <p className="page-muted mb-0">No favorite services pinned yet.</p>
            ) : (
              favoriteServices.map((service) => (
                <div key={service.id} className="form-section-card p-3">
                  <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                    <div>
                      <h3 className="h6 fw-semibold mb-1"><FaStar className="text-warning me-2" />{service.name}</h3>
                      <p className="page-muted small mb-0">{service.category} | Rs. {service.price.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn-app btn-app-primary"
                        onClick={() => startWorkflowWithDraft({
                          serviceId: service.id,
                          totalAmount: service.price,
                          paidAmount: service.price,
                          paymentMode: 'cash',
                          status: 'completed',
                        }, {
                          notice: `${service.name} loaded into the workflow.`,
                        })}
                      >
                        Start
                      </button>
                      <button type="button" className="btn-app btn-app-secondary" onClick={() => toggleFavoriteService(service.id)}>
                        Unpin
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ActionModal>
      );
    }

    if (activeModal === 'confirm-plan-cancel') {
      const planTargetBusiness = currentRole === 'Customer' ? currentBusiness : selectedPlanBusiness;
      const planTargetAccessState = planTargetBusiness ? getBusinessAccessState(planTargetBusiness) : null;

      if (!planTargetBusiness || !planTargetAccessState) {
        return (
          <ActionModal title="Plan Details" eyebrow="Subscription" onClose={closeModal}>
            <ErrorState
              title="Plan details are unavailable"
              description="Refresh the workspace and reopen the plan manager to continue."
              action={{
                label: 'Go To Dashboard',
                onClick: () => {
                  closeModal();
                  onNavigate('dashboard');
                },
              }}
              secondaryAction={{
                label: 'Close',
                onClick: closeModal,
              }}
            />
          </ActionModal>
        );
      }

      return (
        <ConfirmActionModal
          title="Cancel Plan"
          eyebrow="Subscription"
          description={`Review the plan cancellation for ${planTargetBusiness.name}.`}
          promptTitle={`Cancel the current plan for ${planTargetBusiness.name}?`}
          promptDescription="The workspace will move to an inactive state until a new plan is applied."
          confirmLabel="Cancel Plan"
          confirmVariant="danger"
          tone="danger"
          onConfirm={handlePlanCancel}
          onCancel={() => updateUiState('activeModal', 'manage-plan')}
        />
      );
    }

    if (activeModal === 'manage-plan') {
      const planTargetBusiness = currentRole === 'Customer' ? currentBusiness : selectedPlanBusiness;
      const planTargetAccessState = planTargetBusiness ? getBusinessAccessState(planTargetBusiness) : null;

      if (!planTargetBusiness || !planTargetAccessState) {
        return (
          <ActionModal title="Plan Details" eyebrow="Subscription" onClose={closeModal}>
            <ErrorState
              title="Plan details are unavailable"
              description="Refresh the workspace and reopen the plan manager to continue."
              action={{
                label: 'Go To Dashboard',
                onClick: () => {
                  closeModal();
                  onNavigate('dashboard');
                },
              }}
              secondaryAction={{
                label: 'Close',
                onClick: closeModal,
              }}
            />
          </ActionModal>
        );
      }

      return (
        <ActionModal
          title="Manage Plan"
          eyebrow="Subscription"
          description={
            currentRole === 'Admin'
              ? `Update the subscription plan for ${planTargetBusiness.name}.`
              : 'Change the subscription plan that controls this business workspace.'
          }
          onClose={closeModal}
        >
          <SubscriptionPlanForm
            initialSubscription={planTargetBusiness.subscription}
            statusLabel={getSubscriptionStatusLabel(planTargetAccessState.subscription.status)}
            submitLabel={
              currentRole === 'Customer' && isBusinessSubscriptionLocked
                ? 'Renew Plan'
                : 'Save Plan'
            }
            onCancel={closeModal}
            onSubmit={handlePlanUpdate}
            onCancelPlan={
              planTargetAccessState
              && (planTargetAccessState.subscription.status === 'active' || planTargetAccessState.subscription.status === 'trial')
                ? () => updateUiState('activeModal', 'confirm-plan-cancel')
                : undefined
            }
          />
        </ActionModal>
      );
    }

    if (activeModal === 'add-service' || activeModal === 'edit-service') {
      return (
        <ActionModal
          title={editingService ? 'Edit Service' : 'Add Service'}
          eyebrow="Service"
          description={
            editingService
              ? 'Update the service details and department mapping operators use during transactions.'
              : 'Create a department-specific service that operators can select in the one-page workflow.'
          }
          onClose={closeModal}
        >
          <ServiceEditorForm
            departments={availableCounters}
            defaultDepartmentId={selectedCounter?.id}
            departmentLocked={currentRole === 'Employee'}
            initialValues={editingService || undefined}
            submitLabel={editingService ? 'Update Service' : 'Add Service'}
            onCancel={closeModal}
            onSubmit={handleServiceSubmit}
          />
        </ActionModal>
      );
    }

    if (activeModal === 'add-customer' || activeModal === 'edit-customer') {
      const isEditingDirectoryRecord = currentRole === 'Admin' ? Boolean(editingBusiness) : Boolean(editingCustomer);

      return (
        <ActionModal
          title={isEditingDirectoryRecord ? `Edit ${customerEntityLabel}` : `Add ${customerEntityLabel}`}
          eyebrow={customerEntityLabel}
          description={
            currentRole === 'Admin'
              ? editingBusiness
                ? 'Update user contact details, credentials, and workspace permissions.'
                : 'Create a user profile, assign login credentials, and choose the workspace permissions it should receive.'
              : editingCustomer
                ? 'Update customer details used inside the business workspace.'
                : 'Save customer details once and reuse them during service processing.'
          }
          onClose={closeModal}
        >
          {currentRole === 'Admin' ? (
            <BusinessForm
              initialValues={editingBusiness || undefined}
              roleTemplates={roleTemplates}
              isRoleTemplatesLoading={isRoleTemplatesLoading}
              roleTemplatesError={roleTemplatesError}
              submitLabel={editingBusiness ? 'Update User' : 'Add User'}
              onCancel={closeModal}
              onSubmit={handleBusinessSubmit}
            />
          ) : (
            <CustomerForm
              initialValues={editingCustomer || undefined}
              submitLabel={editingCustomer ? 'Update Customer' : 'Add Customer'}
              entityLabel={customerEntityLabel}
              onCancel={closeModal}
              onSubmit={handleCustomerSubmit}
            />
          )}
        </ActionModal>
      );
    }

    if (activeModal === 'add-employee' || activeModal === 'edit-employee') {
      return (
        <ActionModal
          title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
          eyebrow="Employee"
          description={editingEmployee ? 'Update employee details for the business workspace.' : 'Create a new employee profile the business owner can manage.'}
          onClose={closeModal}
        >
          <EmployeeForm
            businessPermissions={currentBusiness?.permissions ?? buildDefaultCustomerPermissions()}
            departments={counters}
            initialValues={editingEmployee || undefined}
            submitLabel={editingEmployee ? 'Update Employee' : 'Add Employee'}
            onCancel={closeModal}
            onSubmit={handleEmployeeSubmit}
          />
        </ActionModal>
      );
    }

    if (activeModal === 'add-department' || activeModal === 'edit-department') {
      return (
        <ActionModal
          title={editingDepartment ? 'Edit Department' : 'Add Department'}
          eyebrow="Department"
          description={editingDepartment ? 'Update the department, linked account, and balance details.' : 'Create a department so the business team can track counter and account mapping clearly.'}
          onClose={closeModal}
        >
          <DepartmentForm
            accounts={accounts}
            initialValues={editingDepartment || undefined}
            submitLabel={editingDepartment ? 'Update Department' : 'Add Department'}
            onCancel={closeModal}
            onSubmit={handleDepartmentSubmit}
          />
        </ActionModal>
      );
    }

    if (activeModal === 'confirm-delete' && pendingDelete) {
      const isTransactionDelete = pendingDelete.actionType === 'DELETE_TRANSACTION';

      return (
        <ConfirmActionModal
          title={isTransactionDelete ? 'Archive Transaction' : 'Delete Record'}
          eyebrow={pendingDelete.module}
          description={isTransactionDelete
            ? 'This keeps the transaction record for audit purposes and removes it from the active workflow.'
            : 'This action removes the record from the current dashboard data.'}
          promptTitle={isTransactionDelete ? `Archive ${pendingDelete.label}?` : `Delete ${pendingDelete.label}?`}
          promptDescription={isTransactionDelete
            ? 'Financial values stay preserved, while the record is hidden from active transaction lists.'
            : 'This keeps the workflow simple while still protecting the team from accidental clicks.'}
          confirmLabel={isTransactionDelete ? 'Archive Transaction' : 'Delete Record'}
          confirmVariant="danger"
          tone="danger"
          onConfirm={confirmDeleteRecord}
          onCancel={closeModal}
        >
          {isTransactionDelete ? (
            <div className="app-field mt-4">
              <label className="form-label">Archive Reason</label>
              <textarea
                className="form-control"
                rows={3}
                value={transactionDeleteReason}
                onChange={(event) => updateUiState('transactionDeleteReason', event.target.value)}
                placeholder="Explain why this transaction is being archived"
              />
            </div>
          ) : null}
        </ConfirmActionModal>
      );
    }

    if (activeModal === 'add-account' || activeModal === 'edit-account') {
      return (
        <ActionModal title={editingAccount ? 'Edit Account' : 'Add Account'} onClose={closeModal}>
          <AccountForm
            initialValues={editingAccount || undefined}
            submitLabel={editingAccount ? 'Update Account' : 'Add Account'}
            onCancel={closeModal}
            onSubmit={handleAccountSubmit}
          />
        </ActionModal>
      );
    }

    if (activeModal === 'add-expense' || activeModal === 'edit-expense') {
      return (
        <ActionModal
          title={editingExpense ? 'Edit Expense' : 'Add Expense'}
          eyebrow="Expense"
          description={editingExpense ? 'Update this expense entry for the business ledger.' : 'Add a new expense entry to the business ledger.'}
          onClose={closeModal}
        >
          <ExpenseForm
            initialValues={editingExpense || undefined}
            submitLabel={editingExpense ? 'Update Expense' : 'Add Expense'}
            onCancel={closeModal}
            onSubmit={handleExpenseSubmit}
          />
        </ActionModal>
      );
    }

    if (activeModal === 'edit-transaction' && editingTransaction) {
      return (
        <ActionModal
          title="Edit Transaction"
          eyebrow="Transactions"
          description="Update payment details, department mapping, or transaction status without breaking account balances."
          onClose={closeModal}
        >
          <TransactionEditForm
            accounts={accounts}
            departments={availableCounters}
            initialValues={editingTransaction}
            lockDepartment={currentRole === 'Employee'}
            services={services}
            onCancel={closeModal}
            onSubmit={handleTransactionSubmit}
          />
        </ActionModal>
      );
    }

    if (activeModal === 'view-transaction' && selectedTransaction) {
      return (
        <ActionModal title="Transaction Details" onClose={closeModal}>
          <DetailList rows={[
            ['Transaction No.', selectedTransaction.transactionNumber],
            ['Customer', selectedTransaction.customerName],
            ['Customer Phone', selectedTransaction.customerPhone || 'Not added'],
            ['Service', selectedTransaction.service],
            ['Payment Mode', selectedTransaction.paymentMode.toUpperCase()],
            ['Total Amount', `Rs. ${selectedTransaction.totalAmount.toLocaleString('en-IN')}`],
            ['Paid Amount', `Rs. ${selectedTransaction.paidAmount.toLocaleString('en-IN')}`],
            ['Due Amount', `Rs. ${selectedTransaction.dueAmount.toLocaleString('en-IN')}`],
            ['Department', selectedTransaction.departmentName || 'Not assigned'],
            ['Account', selectedTransaction.accountLabel || 'Not linked'],
            ['Handled By', `${selectedTransaction.handledByName} (${selectedTransaction.handledByRole})`],
            ['Status', selectedTransaction.status],
            ['Notes', selectedTransaction.note || 'No notes'],
            ['Date', selectedTransaction.date],
          ]} />
          <div className="modal-actions">
            {canPerformModuleAction('transactions', 'edit') ? (
              <button
                type="button"
                className="btn-app btn-app-secondary"
                onClick={() => {
                  updateUiState('editingTransaction', selectedTransaction);
                  updateUiState('activeModal', 'edit-transaction');
                }}
              >
                Edit Transaction
              </button>
            ) : null}
            <button
              type="button"
              className="btn-app btn-app-secondary"
              onClick={() => startWorkflowWithDraft({
                customerId: selectedTransaction.customerId,
                customerName: selectedTransaction.customerName,
                customerPhone: selectedTransaction.customerPhone,
                customerEmail: workspace.customers.find((customer) => customer.id === selectedTransaction.customerId)?.email,
                serviceId: selectedTransaction.serviceId,
                totalAmount: selectedTransaction.totalAmount,
                paidAmount: selectedTransaction.totalAmount,
                paymentMode: selectedTransaction.paymentMode,
                status: 'completed',
                note: selectedTransaction.note,
              }, {
                departmentId: selectedTransaction.departmentId,
                notice: `Transaction ${selectedTransaction.transactionNumber} loaded into the workflow for review.`,
              })}
            >
              Load Into Workflow
            </button>
            {selectedTransaction.status === 'pending' ? (
              <button
                type="button"
                className="btn-app btn-app-danger"
                onClick={() => handleCancelTransaction(selectedTransaction)}
              >
                Cancel Transaction
              </button>
            ) : null}
            <button type="button" className="btn-app btn-app-secondary" onClick={() => handlePrintReceipt(selectedTransaction)}>
              Print Receipt
            </button>
            <button type="button" className="btn-app btn-app-primary" onClick={() => handleDownloadReceipt(selectedTransaction)}>
              Download Receipt
            </button>
          </div>
        </ActionModal>
      );
    }

    if (activeModal === 'view-customer-history' && selectedCustomerHistory) {
      return (
        <ActionModal
          title="Customer History"
          eyebrow="Customers"
          description="Review this customer’s transaction history, collections, and outstanding balance before creating the next transaction."
          onClose={closeModal}
        >
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <DetailList rows={[
                ['Customer', selectedCustomerHistory.name],
                ['Phone', selectedCustomerHistory.phone],
                ['Email', selectedCustomerHistory.email || 'Not added'],
                ['Status', selectedCustomerHistory.status || 'Active'],
              ]} />
            </div>
            <div className="col-12 col-md-6">
              <DetailList rows={[
                ['Transactions', selectedCustomerSummary.totalTransactions],
                ['Gross Amount', `Rs. ${selectedCustomerSummary.grossAmount.toLocaleString('en-IN')}`],
                ['Collected Amount', `Rs. ${selectedCustomerSummary.collectedAmount.toLocaleString('en-IN')}`],
                ['Outstanding Amount', `Rs. ${selectedCustomerSummary.outstandingAmount.toLocaleString('en-IN')}`],
                ['Last Visit', selectedCustomerSummary.lastVisit],
              ]} />
            </div>
          </div>
          <ReusableListTable
            data={selectedCustomerTransactions}
            rowKey={(transaction) => transaction.id}
            eyebrow="Customer Ledger"
            title="Transaction history"
            copy="All saved service transactions for this customer."
            emptyMessage="No transaction history found for this customer."
            className="mb-4"
            mobileCards={false}
            columns={[
              { key: 'transactionNumber', header: 'Txn No.', render: (transaction) => transaction.transactionNumber },
              { key: 'service', header: 'Service', render: (transaction) => transaction.service },
              { key: 'total', header: 'Total', render: (transaction) => `Rs. ${transaction.totalAmount.toLocaleString('en-IN')}` },
              { key: 'paid', header: 'Paid', render: (transaction) => `Rs. ${transaction.paidAmount.toLocaleString('en-IN')}` },
              { key: 'due', header: 'Due', render: (transaction) => `Rs. ${transaction.dueAmount.toLocaleString('en-IN')}` },
              { key: 'status', header: 'Status', render: (transaction) => transaction.status },
              { key: 'date', header: 'Date', render: (transaction) => transaction.date },
            ]}
          />
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={closeModal}>Close</button>
            <button
              type="button"
              className="btn-app btn-app-primary"
              onClick={() => startWorkflowWithDraft({
                customerId: selectedCustomerHistory.id,
                customerName: selectedCustomerHistory.name,
                customerPhone: selectedCustomerHistory.phone,
                customerEmail: selectedCustomerHistory.email,
              }, {
                notice: `${selectedCustomerHistory.name} loaded into the transaction workflow.`,
              })}
            >
              Load Customer Into Workflow
            </button>
          </div>
        </ActionModal>
      );
    }

    if (activeModal === 'view-history' && selectedHistoryEvent) {
      return (
        <ActionModal title="History Details" onClose={closeModal}>
          <DetailList rows={[
            ['Event', selectedHistoryEvent.title],
            ['Module', selectedHistoryEvent.module],
            ['Actor', selectedHistoryEvent.actor],
            ['Status', selectedHistoryEvent.status],
            ['Date', selectedHistoryEvent.date],
          ]} />
        </ActionModal>
      );
    }

    if (activeModal === 'view-report' && selectedReport) {
      return (
        <ActionModal title="Report Details" onClose={closeModal}>
          <DetailList rows={[
            ['Report', selectedReport.name],
            ['Type', selectedReport.type],
            ['Owner', selectedReport.owner],
            ['Status', selectedReport.status],
            ['Date', selectedReport.date],
          ]} />
          {selectedReport.summary ? (
            <div className="form-section-card mt-4">
              <div className="form-section-title mb-3">Daily Closing Snapshot</div>
              <DetailList rows={[
                ['Transactions', selectedReport.summary.transactionCount],
                ['Completed', selectedReport.summary.completedCount],
                ['Pending', selectedReport.summary.pendingCount],
                ['Cancelled', selectedReport.summary.cancelledCount],
                ['Refunded', selectedReport.summary.refundedCount],
                ['Gross Amount', `Rs. ${selectedReport.summary.grossAmount.toLocaleString('en-IN')}`],
                ['Collected Amount', `Rs. ${selectedReport.summary.collectedAmount.toLocaleString('en-IN')}`],
                ['Outstanding Amount', `Rs. ${selectedReport.summary.outstandingAmount.toLocaleString('en-IN')}`],
                ['Expenses', `Rs. ${selectedReport.summary.expenseAmount.toLocaleString('en-IN')}`],
                ['Net Amount', `Rs. ${selectedReport.summary.netAmount.toLocaleString('en-IN')}`],
                ['Top Service', selectedReport.summary.topService],
                ['Busiest Department', selectedReport.summary.busiestDepartment],
              ]} />
            </div>
          ) : null}
        </ActionModal>
      );
    }

    if (activeModal === 'confirm-option-change') {
      if (!selectedOption) {
        return (
          <ActionModal title="Setting Change" eyebrow="Settings" onClose={closeModal}>
            <ErrorState
              title="Setting details are unavailable"
              description="Refresh the workspace and reopen this setting to continue."
              action={{
                label: 'Close',
                onClick: closeModal,
              }}
            />
          </ActionModal>
        );
      }

      const isDisablingOption = selectedOption.status === 'Enabled';

      return (
        <ConfirmActionModal
          title={isDisablingOption ? 'Disable Setting' : 'Enable Setting'}
          eyebrow={getModuleLabel('additions') || 'Settings'}
          description={`Review this change for ${selectedOption.title} before continuing.`}
          promptTitle={`${isDisablingOption ? 'Disable' : 'Enable'} ${selectedOption.title}?`}
          promptDescription="This may affect shared reports, rules, or integrations for the workspace."
          confirmLabel={isDisablingOption ? 'Disable Setting' : 'Enable Setting'}
          confirmVariant={isDisablingOption ? 'danger' : 'primary'}
          tone={isDisablingOption ? 'danger' : 'default'}
          onConfirm={handleToggleOption}
          onCancel={() => updateUiState('activeModal', 'configure-option')}
        />
      );
    }

    if (activeModal === 'configure-option' && selectedOption) {
      return (
        <ActionModal title="Configure Option" onClose={closeModal}>
          <DetailList rows={[
            ['Option', selectedOption.title],
            ['Category', selectedOption.category],
            ['Current Status', selectedOption.status],
            ['Description', selectedOption.description],
          ]} />
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={closeModal}>Cancel</button>
            <button
              type="button"
              className="btn-app btn-app-primary"
              onClick={() => updateUiState('activeModal', 'confirm-option-change')}
            >
              {selectedOption.status === 'Enabled' ? 'Disable Option' : 'Enable Option'}
            </button>
          </div>
        </ActionModal>
      );
    }

    if (activeModal === 'manage-options') {
      return (
        <ActionModal title="System Settings" onClose={closeModal}>
          <p className="page-muted">
            Use the Configure buttons in the settings table to enable or disable service rules, reports, audit controls, and integrations.
          </p>
          <button type="button" className="btn-app btn-app-primary" onClick={closeModal}>Got it</button>
        </ActionModal>
      );
    }

    return null;
  };

  const activeTabCtx: DashboardTabContext = {
    currentRole,
    currentUser,
    dashboardSummary: apiDashboardSummary,
    currentBusinessProfile: currentBusiness || null,
    currentEmployeeProfile: currentEmployee,
    accessContext,
    selectedCounter,
    availableCounters,
    visibleServices,
    recentServices,
    notifications,
    businesses,
    accounts,
    employees,
    counters,
    reports,
    expenses,
    additionOptions,
    roleTemplates,
    isRoleTemplatesLoading,
    roleTemplatesError,
    workflowDraft,
    employeeAssignedDepartment,
    displayUserName,
    filteredTransactionRecords,
    filteredHistoryEvents,
    filteredDepartments,
    filteredBusinesses,
    customerDirectoryRecords,
    customerOutstandingRows,
    customerPaymentTransactions,
    customerPageView,
    customerPageOptions,
    customerSectionTitle,
    customerSectionDescription,
    customerEntityLabel,
    customerEntityPlural,
    businessDirectoryFilters,
    businessPermissionFilterLabel,
    hasActiveBusinessDirectoryFilters,
    isBusinessDirectoryLoading: isBackendBusinessesLoading,
    businessDirectoryError: backendBusinessesError,
    customerDirectoryPagination,
    historyStatusFilter,
    departmentSearchInput,
    departmentAccountStatusFilter,
    isTransactionFiltersOpen,
    transactionFilters,
    hasActiveTransactionFilters,
    serviceSummary,
    customerSummary,
    reminderSummary,
    employeeSummary,
    departmentSummary,
    accountSummary,
    transactionSummary,
    historySummary,
    reportSummary,
    expenseSummary,
    canEmployeeOperateOnDepartment,
    canAddCustomerRecords,
    canViewCustomerRecords,
    canEditCustomerRecords,
    canDeleteCustomerRecords,
    canAddEmployeeRecords,
    canViewEmployeeRecords,
    canEditEmployeeRecords,
    canDeleteEmployeeRecords,
    canAddDepartmentRecords,
    canEditDepartmentRecords,
    canDeleteDepartmentRecords,
    canAddAccountRecords,
    canEditAccountRecords,
    canDeleteAccountRecords,
    hasRequestedCustomerPageAccess,
    renderSummaryCards,
    renderTransactionFilters,
    renderBusinessPlanSection,
    renderAdminDashboard,
    renderCustomerRoutePermissionState,
    canManageModule,
    canDeleteModule,
    canPerformModuleAction,
    canAccessModuleForSession,
    getRoleLabel,
    showNotification: addNotification,
    reloadRoleTemplates,
    handleLogout: onLogout,
    handleAdminProfileSave,
    handleBusinessProfileSave,
    handleEmployeeProfileSave,
    handleQuickAction,
    handleDismissNotification,
    handleViewTransaction,
    handleDeleteRecord,
    handleEditService,
    handleDeleteService,
    handleViewCustomerHistory,
    handleEditCustomer,
    handleViewHistory,
    handleEditEmployee,
    handleDepartmentSearch,
    clearDepartmentFilters,
    handleEditDepartment,
    handleEditAccount,
    handleEditTransaction,
    handleViewReport,
    handleEditExpense,
    handleConfigureOption,
    setIsTransactionFiltersOpen,
    setDepartmentSearchInput,
    setDepartmentAccountStatusFilter,
    setBusinessDirectoryFilters,
  };

  const renderModuleDataState = () => {
    if (currentRole === 'Admin') {
      return null;
    }

    if (activeTab === 'departments') {
      if (isDepartmentsLoading && counters.length === 0) {
        return (
          <LoadingState
            eyebrow="Loading Departments"
            title="Fetching departments"
            description="Pulling the latest department and counter records from the backend."
          />
        );
      }

      if (departmentsError && counters.length === 0) {
        return (
          <ErrorState
            eyebrow="Departments Unavailable"
            title="Unable to load departments"
            description={departmentsError}
            action={{ label: 'Retry', onClick: reloadDepartments }}
          />
        );
      }
    }

    if (activeTab === 'customers') {
      if (isCustomersLoading && customers.length === 0) {
        return (
          <LoadingState
            eyebrow="Loading Customers"
            title="Fetching customers"
            description="Pulling the latest customer directory from the backend."
          />
        );
      }

      if (customersError && customers.length === 0) {
        return (
          <ErrorState
            eyebrow="Customers Unavailable"
            title="Unable to load customers"
            description={customersError}
            action={{ label: 'Retry', onClick: reloadCustomers }}
          />
        );
      }
    }

    if (activeTab === 'employee') {
      if (isEmployeesLoading && employees.length === 0) {
        return (
          <LoadingState
            eyebrow="Loading Employees"
            title="Fetching employees"
            description="Pulling the latest employee records from the backend."
          />
        );
      }

      if (employeesError && employees.length === 0) {
        return (
          <ErrorState
            eyebrow="Employees Unavailable"
            title="Unable to load employees"
            description={employeesError}
            action={{ label: 'Retry', onClick: reloadEmployees }}
          />
        );
      }
    }

    if (activeTab === 'transactions') {
      if (isTransactionsLoading && transactionHistory.length === 0) {
        return (
          <LoadingState
            eyebrow="Loading Transactions"
            title="Fetching transactions"
            description="Pulling the latest transaction records from the backend."
          />
        );
      }

      if (transactionsError && transactionHistory.length === 0) {
        return (
          <ErrorState
            eyebrow="Transactions Unavailable"
            title="Unable to load transactions"
            description={transactionsError}
            action={{ label: 'Retry', onClick: reloadTransactions }}
          />
        );
      }
    }

    if (activeTab === 'reports') {
      if (isReportsLoading && reports.length === 0) {
        return (
          <LoadingState
            eyebrow="Loading Reports"
            title="Fetching reports"
            description="Pulling the latest report records from the backend."
          />
        );
      }

      if (reportsError && reports.length === 0) {
        return (
          <ErrorState
            eyebrow="Reports Unavailable"
            title="Unable to load reports"
            description={reportsError}
            action={{ label: 'Retry', onClick: reloadReports }}
          />
        );
      }
    }

    return null;
  };

  const renderContent = () => {
    if (isBusinessSubscriptionLocked && activeTab !== 'profile') {
      return (
        <div className="row g-4">
          {renderBusinessPlanSection(true)}
        </div>
      );
    }

    if (shouldRequireDepartmentSetup && activeTab !== 'departments' && activeTab !== 'profile') {
      return (
        <EmptyState
          eyebrow="Department Setup"
          title="Create your first department"
          description="This business workspace does not have any departments yet. Open the Departments page and add one before continuing with daily operations."
          action={{
            label: 'Open Departments',
            onClick: () => onNavigate('departments'),
          }}
        />
      );
    }

    if (!canAccessModuleForSession(accessContext, activeTab)) {
      return renderPermissionDenied(activeTab);
    }

    const remoteModuleState = renderModuleDataState();
    if (remoteModuleState) {
      return remoteModuleState;
    }

    return (
      <DashboardTabContextProvider value={activeTabCtx}>
        {children}
      </DashboardTabContextProvider>
    );

  };

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 991.98px)').matches) {
      setIsSidebarOpen((prev) => !prev);
      return;
    }

    setIsSidebarCollapsed((prev) => !prev);
  };
  const closeSidebar = () => setIsSidebarOpen(false);

  if (shouldShowBusinessOnboarding && currentBusiness) {
    return (
      <BusinessOnboarding
        key={`${currentBusiness.id}:${currentBusiness.name}:${effectiveOnboardingStep}`}
        business={currentBusiness}
        currentStep={effectiveOnboardingStep}
        departments={counters}
        accounts={accounts}
        services={services}
        customers={workspace.customers}
        canAddMoreDepartments={isPermissionEnabled(accessContext.permissions, 'master_department_manage')}
        canAddMoreAccounts={isPermissionEnabled(accessContext.permissions, 'master_account_manage')}
        canAccessServices={canAccessOnboardingServices}
        onLogout={onLogout}
        onSaveBusinessName={handleOnboardingBusinessNameSave}
        onSaveDepartment={handleOnboardingDepartmentSave}
        onAdvanceDepartments={handleOnboardingAdvanceDepartments}
        onSaveAccount={handleOnboardingAccountSave}
        onAdvanceAccounts={handleOnboardingAdvanceAccounts}
        onSaveService={handleOnboardingServiceSave}
        onAdvanceServices={handleOnboardingAdvanceServices}
        onImportCustomers={handleOnboardingCustomerImport}
        onSkipCustomers={handleOnboardingSkipCustomers}
      />
    );
  }

  return (
    <div className="dashboard-shell">
      <Sidebar
        activeTab={activeTab}
        accessContext={accessContext}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={closeSidebar}
      />
      {isSidebarOpen && <div className="sidebar-backdrop d-md-none" onClick={closeSidebar} />}
      <div className="dashboard-main">
        <Header
          activeTab={activeTab}
          customerPageView={customerPageView}
          counters={availableCounters}
          selectedCounterId={safeSelectedCounterId}
          notificationCount={notifications.length}
          searchValue={searchQuery}
          currentUser={{ ...currentUser, name: displayUserName }}
          onCounterChange={setSelectedCounterId}
          onSearch={handleSearch}
          onProfileOpen={() => onNavigate('profile')}
          onNotificationsClick={() => updateUiState('activeModal', 'notifications')}
          isSidebarOpen={isSidebarOpen}
          onSidebarToggle={toggleSidebar}
        />
        <main className="dashboard-content">
          <div className="content-container">
            {isSearchActive ? renderSearchResults() : renderContent()}
          </div>
        </main>
        <Footer />
      </div>
      {renderModal()}
    </div>
  );
};

export default Dashboard;
