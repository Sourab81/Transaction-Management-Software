'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaBell, FaBuilding, FaDollarSign, FaExclamationTriangle, FaHourglassHalf, FaUsers, FaChartLine, FaCog, FaReceipt, FaHistory, FaTools, FaFolderOpen, FaFileAlt, FaPlusCircle, FaUsersCog, FaArchive, FaUniversity, FaStar } from 'react-icons/fa';
import { type SessionUser } from '../../lib/auth-session';
import { buildCsv } from '../../lib/csv';
import {
  canPerformModuleActionForSession,
  canDeleteModuleForSession,
  canManageModuleForSession,
  canViewModuleRecordsForSession,
  getSearchMatches,
  getTransactionSummary,
  getVisibleCustomers,
  getVisibleServices,
  getVisibleTransactions,
} from '../../lib/dashboard-controller';
import {
  createEmptyBusinessWorkspace,
  createRecordId,
  getBusinessWorkspace,
  getDepartmentDefaultAccount,
  getDepartmentLinkedAccountIds,
  getDepartmentLinkedAccounts,
  getServicesForDepartment,
  useApp,
} from '../../lib/store';
import type { Account, AdditionOption, Business, BusinessCustomer, BusinessOnboardingStep, Counter, Employee, Expense, HistoryEvent, ReportItem, Service, Transaction } from '../../lib/store';
import { buildDailyClosingSummary, buildTransactionReceiptText } from '../../lib/transaction-workflow';
import {
  buildDefaultCustomerPermissions,
  canAccessModuleForSession,
  customerPermissionOptions,
  getModuleDisplayById,
  getRoleLabel,
  intersectCustomerPermissions,
  isPermissionEnabled,
} from '../../lib/platform-structure';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import DashboardCard from '../dashboard/DashboardCard';
import ServiceForm, { type ServiceWorkflowDraft } from '../forms/ServiceForm';
import AccountForm, { type AccountFormValues } from '../forms/AccountForm';
import BusinessForm, { type BusinessFormValues } from '../forms/BusinessForm';
import CustomerForm, { type CustomerFormValues } from '../forms/CustomerForm';
import DepartmentForm, { type DepartmentFormValues } from '../forms/DepartmentForm';
import EmployeeForm, { type EmployeeFormValues } from '../forms/EmployeeForm';
import ExpenseForm, { type ExpenseFormValues } from '../forms/ExpenseForm';
import ServiceEditorForm, { type ServiceFormValues } from '../forms/ServiceEditorForm';
import SubscriptionPlanForm from '../forms/SubscriptionPlanForm';
import TransactionEditForm, { type TransactionEditorValues } from '../forms/TransactionEditForm';
import TransactionTable from '../tables/TransactionTable';
import CountersTable from '../tables/CountersTable';
import RecentServicesTable from '../tables/RecentServicesTable';
import AccountsTable from '../tables/AccountsTable';
import ServicesTable from '../tables/ServicesTable';
import CustomersTable from '../tables/CustomersTable';
import CustomerPaymentsTable from '../tables/CustomerPaymentsTable';
import CustomerOutstandingTable, { type CustomerOutstandingRow } from '../tables/CustomerOutstandingTable';
import DepartmentsTable from '../tables/DepartmentsTable';
import EmployeesTable from '../tables/EmployeesTable';
import ExpensesTable from '../tables/ExpensesTable';
import HistoryTable from '../tables/HistoryTable';
import ReportsTable from '../tables/ReportsTable';
import AdditionsTable from '../tables/AdditionsTable';
import SubscriptionTransactionsTable from '../tables/SubscriptionTransactionsTable';
import ActionModal from '../ui/ActionModal';
import QuickActions from './QuickActions';
import NotificationCenter from './NotificationCenter';
import WelcomeHero from './WelcomeHero';
import BusinessOnboarding from './BusinessOnboarding';
import Footer from '../layout/Footer';
import {
  businessSubscriptionPlans,
  getBusinessAccessState,
  getBusinessSubscriptionPlan,
  type BusinessSubscription,
} from '../../lib/subscription';
import { getCustomerWorkspacePath, type CustomerWorkspaceView } from '../../lib/workspace-routes';

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  colorClass: string;
}

const summaryColorMap: Record<string, string> = {
  'bg-primary': 'blue',
  'bg-success': 'green',
  'bg-warning': 'orange',
  'bg-info': 'purple',
  'bg-danger': 'red',
};

const customerPageCopyMap: Record<CustomerWorkspaceView, { label: string; title: string; description: string }> = {
  list: {
    label: 'Customer List',
    title: 'Keep your customer base engaged',
    description: 'View and manage customer directory records.',
  },
  payments: {
    label: 'Customer Payment List',
    title: 'Review customer payment activity',
    description: 'Review customer payment records and statuses.',
  },
  outstanding: {
    label: 'Customer Outstanding',
    title: 'Track customer outstanding balances',
    description: 'Track pending customer balances.',
  },
};

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, detail, colorClass }) => {
  const tone = summaryColorMap[colorClass] || 'blue';

  return (
    <div className={`metric-card summary-card--${tone}`}>
      <div className="metric-card__top">
        <div>
          <p className="metric-card__label">{title}</p>
          <p className="metric-card__value">{value}</p>
        </div>
        <div className="metric-card__icon">{icon}</div>
      </div>
      <p className="metric-card__detail">{detail}</p>
    </div>
  );
};

interface SectionHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };
}

const SectionHero: React.FC<SectionHeroProps> = ({ eyebrow, title, description, action }) => (
  <section className="panel section-hero">
    <div className="section-hero__content">
      <div className="panel-header mb-0">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-copy">{description}</p>
        </div>
        {action ? (
          <div className="section-hero__actions mt-0">
            <button type="button" className="btn-app btn-app-primary" onClick={action.onClick}>
              {action.icon}
              {action.label}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  </section>
);

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

const isDefaultSeedDepartment = (department: Counter) => (
  department.name === 'MAIN DEPARTMENT' &&
  department.code === 'D1' &&
  department.openingBalance === 0 &&
  department.currentBalance === 0
);

const isDefaultSeedAccount = (account: Account) => (
  account.accountHolder === 'Primary Account' &&
  account.bankName === 'Default Bank' &&
  account.accountNumber === '000000000001' &&
  account.ifsc === 'ENST0000001' &&
  account.openingBalance === 0 &&
  account.currentBalance === 0
);

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

interface PendingDelete {
  actionType: DeleteActionType;
  id: string;
  label: string;
  module: string;
}

interface DashboardProps {
  currentUser: SessionUser;
  onLogout: () => void;
  activeTab: string;
  customerPageView: CustomerWorkspaceView;
  onNavigate: (moduleId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout, activeTab, customerPageView, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { state, dispatch } = useApp();
  const currentRole = currentUser.role;
  const currentBusiness = currentUser.businessId
    ? state.businesses.find((business) => business.id === currentUser.businessId) || null
    : null;
  const workspace = useMemo(
    () => currentRole === 'Admin'
      ? createEmptyBusinessWorkspace()
      : getBusinessWorkspace(state, currentUser.businessId),
    [currentRole, currentUser.businessId, state],
  );
  const businesses = state.businesses;
  const accounts = workspace.accounts;
  const services = workspace.services;
  const recentServices = workspace.recentServices;
  const customers: Array<Business | BusinessCustomer> = currentRole === 'Admin' ? businesses : workspace.customers;
  const employees = workspace.employees;
  const expenses = workspace.expenses;
  const transactionHistory = workspace.transactions;
  const baseNotifications = currentRole === 'Admin' ? state.adminWorkspace.notifications : workspace.notifications;
  const historyEvents = currentRole === 'Admin' ? state.adminWorkspace.historyEvents : workspace.historyEvents;
  const reports = currentRole === 'Admin' ? state.adminWorkspace.reports : workspace.reports;
  const additionOptions = state.adminWorkspace.additionOptions;
  const counters = workspace.counters;
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<ModalMode>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [selectedPlanBusiness, setSelectedPlanBusiness] = useState<Business | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<BusinessCustomer | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Counter | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<BusinessCustomer | null>(null);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<HistoryEvent | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<AdditionOption | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [workflowDraft, setWorkflowDraft] = useState<ServiceWorkflowDraft | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | 'Failed'>('All');
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>(['service-1', 'service-3']);
  const [businessPermissionFilter, setBusinessPermissionFilter] = useState('all');
  const [transactionFilterQuery, setTransactionFilterQuery] = useState('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<'All' | 'completed' | 'pending' | 'cancelled' | 'refunded'>('All');
  const [transactionPaymentModeFilter, setTransactionPaymentModeFilter] = useState<'All' | 'cash' | 'upi' | 'bank' | 'card'>('All');
  const [transactionDepartmentFilter, setTransactionDepartmentFilter] = useState('All');
  const [transactionHandlerFilter, setTransactionHandlerFilter] = useState('All');
  const [transactionDateFrom, setTransactionDateFrom] = useState('');
  const [transactionDateTo, setTransactionDateTo] = useState('');
  const [isTransactionFiltersOpen, setIsTransactionFiltersOpen] = useState(false);
  const [departmentSearchInput, setDepartmentSearchInput] = useState('');
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('');
  const [departmentAccountStatusFilter, setDepartmentAccountStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Unassigned'>('All');
  const [adminPlanSearchQuery, setAdminPlanSearchQuery] = useState('');
  const [adminPlanIdFilter, setAdminPlanIdFilter] = useState('All');
  const [adminPlanStatusFilter, setAdminPlanStatusFilter] = useState<'All' | BusinessSubscription['status']>('All');
  const [adminPlanWorkspaceFilter, setAdminPlanWorkspaceFilter] = useState<'All' | 'Active' | 'Locked'>('All');
  const [adminPlanExpiryFilter, setAdminPlanExpiryFilter] = useState<'All' | 'Expiring Soon' | 'Expired' | 'Cancelled'>('All');
  const [isAdminPlanFiltersOpen, setIsAdminPlanFiltersOpen] = useState(false);
  const [dismissedGeneratedNotificationIds, setDismissedGeneratedNotificationIds] = useState<string[]>([]);
  const currentEmployee = currentRole === 'Employee'
    ? employees.find((employee) => employee.id === currentUser.id) || null
    : null;
  const sessionPermissions = useMemo(() => {
    if (currentRole === 'Employee') {
      return intersectCustomerPermissions(
        currentBusiness?.permissions ?? buildDefaultCustomerPermissions(),
        currentEmployee?.permissions ?? currentBusiness?.permissions ?? buildDefaultCustomerPermissions(),
      );
    }

    return currentBusiness?.permissions ?? null;
  }, [currentBusiness?.permissions, currentEmployee?.permissions, currentRole]);
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
  const availableCounters = currentRole === 'Employee'
    ? currentEmployee?.departmentId
      ? counters.filter((counter) => counter.id === currentEmployee.departmentId)
      : []
    : counters;
  const employeeAssignedDepartment = currentEmployee?.departmentId
    ? counters.find((counter) => counter.id === currentEmployee.departmentId)
    : null;

  const safeSelectedCounterId = availableCounters.some((counter) => counter.id === selectedCounterId)
    ? selectedCounterId
    : availableCounters[0]?.id || '';
  const selectedCounter = availableCounters.find((counter) => counter.id === safeSelectedCounterId) || availableCounters[0];
  const selectedDepartmentName = selectedCounter?.name || '';
  const departmentScopedServices = getServicesForDepartment(services, selectedCounter?.id);
  const visibleServices = getVisibleServices(accessContext, departmentScopedServices);
  const visibleCustomers = useMemo(
    () => getVisibleCustomers(accessContext, customers),
    [accessContext, customers],
  );
  const visibleTransactionHistory = useMemo(
    () => getVisibleTransactions(
      accessContext,
      transactionHistory,
    ),
    [accessContext, transactionHistory],
  );
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
  const favoriteServices = visibleServices.filter((service) => favoriteServiceIds.includes(service.id));
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const searchMatches = getSearchMatches({
    context: accessContext,
    query: normalizedSearchQuery,
    services: getServicesForDepartment(services, selectedCounter?.id),
    customers,
    transactions: transactionHistory,
  });

  const filteredBusinesses = useMemo(() => {
    if (businessPermissionFilter === 'all') {
      return businesses;
    }

    return businesses.filter((business) =>
      isPermissionEnabled(business.permissions, businessPermissionFilter)
    );
  }, [businessPermissionFilter, businesses]);
  const businessPermissionFilterLabel = businessPermissionFilter === 'all'
    ? 'All permissions'
    : customerPermissionOptions.find((option) => option.id === businessPermissionFilter)?.label || 'Selected permission';
  const customerPageOptions = currentRole === 'Admin'
    ? [{ id: 'list' as const, label: 'Business List', description: 'Manage business directory records.' }]
    : ([
        isPermissionEnabled(accessContext.permissions, 'customers.list')
          ? { id: 'list' as const, label: 'Customer List', description: 'View and manage customer directory records.' }
          : null,
        isPermissionEnabled(accessContext.permissions, 'customers.payment_list')
          ? { id: 'payments' as const, label: 'Customer Payment List', description: 'Review customer payment records and statuses.' }
          : null,
        isPermissionEnabled(accessContext.permissions, 'customers.outstanding')
          ? { id: 'outstanding' as const, label: 'Customer Outstanding', description: 'Track pending customer balances.' }
          : null,
      ].filter((option): option is { id: CustomerWorkspaceView; label: string; description: string } => Boolean(option)));
  const requestedCustomerPageCopy = customerPageCopyMap[customerPageView];
  const requestedCustomerPageOption = customerPageOptions.find((option) => option.id === customerPageView) || null;
  const hasRequestedCustomerPageAccess = currentRole === 'Admin'
    ? customerPageView === 'list'
    : Boolean(requestedCustomerPageOption);
  const customerPaymentTransactions = currentRole === 'Admin'
    ? []
    : [...transactionHistory].sort((left, right) => right.date.localeCompare(left.date));
  const customerDirectoryRecords = currentRole === 'Admin' ? filteredBusinesses : visibleCustomers;
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

  const customerEntityLabel = currentRole === 'Admin' ? 'Business' : 'Customer';
  const customerEntityPlural = currentRole === 'Admin' ? 'Businesses' : 'Customers';
  const customerDirectoryCount = currentRole === 'Admin' ? filteredBusinesses.length : visibleCustomers.length;
  const customerSectionTitle = currentRole === 'Admin'
    ? customerPageView === 'list'
      ? 'Manage the business directory'
      : requestedCustomerPageCopy.title
    : requestedCustomerPageCopy.title;
  const customerSectionDescription = currentRole === 'Admin'
    ? customerPageView === 'list'
      ? 'Monitor the businesses managed in the platform from one place.'
      : 'The admin workspace only supports the business directory on customer routes.'
    : requestedCustomerPageCopy.description;

  const serviceSummary = [
    {
      title: 'Total Services',
      value: `${visibleServices.length}`,
      detail: selectedDepartmentName ? `${selectedDepartmentName} catalog` : 'Active service items',
      icon: <FaCog />,
      colorClass: 'bg-primary',
    },
    { title: 'Revenue Streams', value: 'Rs. 18.2K', detail: 'Last 30 days', icon: <FaDollarSign />, colorClass: 'bg-success' },
    { title: 'Pending Updates', value: '6', detail: 'Service rules to review', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
    { title: 'New Requests', value: '13', detail: 'Customer submitted tasks', icon: <FaPlusCircle />, colorClass: 'bg-info' },
  ];

  const customerSummary = useMemo(() => {
    if (currentRole === 'Admin') {
      const activeBusinesses = businesses.filter((business) => business.status !== 'Inactive').length;
      const inactiveBusinesses = businesses.length - activeBusinesses;

      return [
        { title: 'Total Businesses', value: `${businesses.length}`, detail: 'All registered business logins', icon: <FaUsers />, colorClass: 'bg-primary' },
        { title: 'Active Businesses', value: `${activeBusinesses}`, detail: 'Can sign in and use the workspace', icon: <FaUsersCog />, colorClass: 'bg-success' },
        { title: 'Inactive Businesses', value: `${inactiveBusinesses}`, detail: 'Blocked from logging in until reactivated', icon: <FaFolderOpen />, colorClass: 'bg-warning' },
        { title: 'Permission Match', value: `${filteredBusinesses.length}`, detail: `Filter: ${businessPermissionFilterLabel}`, icon: <FaChartLine />, colorClass: 'bg-info' },
      ];
    }

    return [
      { title: `Total ${customerEntityPlural}`, value: `${customerDirectoryCount}`, detail: 'All registered customers', icon: <FaUsers />, colorClass: 'bg-primary' },
      { title: 'Active Users', value: '834', detail: 'Logged in last 7 days', icon: <FaUsersCog />, colorClass: 'bg-success' },
      { title: 'New Leads', value: '47', detail: 'Captured this week', icon: <FaFolderOpen />, colorClass: 'bg-warning' },
      { title: 'Response Rate', value: '92%', detail: 'Customer interactions', icon: <FaChartLine />, colorClass: 'bg-info' },
    ];
  }, [businessPermissionFilterLabel, businesses, currentRole, customerDirectoryCount, customerEntityPlural, filteredBusinesses.length]);

  const accountSummary = useMemo(() => [
    { title: 'Total Accounts', value: `${accounts.length}`, detail: 'Bank accounts on record', icon: <FaUniversity />, colorClass: 'bg-primary' },
    { title: 'Active Accounts', value: `${activeAccounts}`, detail: 'Ready for transactions', icon: <FaChartLine />, colorClass: 'bg-success' },
    { title: 'Total Balance', value: `Rs. ${totalAccountBalance.toLocaleString('en-IN')}`, detail: 'Current available balance', icon: <FaDollarSign />, colorClass: 'bg-info' },
    { title: 'Review Needed', value: `${accounts.length - activeAccounts}`, detail: 'Inactive or paused accounts', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
  ], [accounts.length, activeAccounts, totalAccountBalance]);

  const transactionStats = useMemo(
    () => getTransactionSummary(visibleTransactionHistory),
    [visibleTransactionHistory],
  );
  const transactionDepartmentOptions = useMemo(
    () => Array.from(new Set(visibleTransactionHistory.map((transaction) => transaction.departmentName).filter(Boolean))),
    [visibleTransactionHistory],
  );
  const transactionHandlerOptions = useMemo(
    () => Array.from(new Set(visibleTransactionHistory.map((transaction) => transaction.handledByName).filter(Boolean))),
    [visibleTransactionHistory],
  );
  const filteredTransactionRecords = useMemo(() => {
    const normalizedQuery = transactionFilterQuery.trim().toLowerCase();

    return visibleTransactionHistory.filter((transaction) => {
      const matchesQuery = !normalizedQuery || [
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
        .includes(normalizedQuery);
      const matchesStatus = transactionStatusFilter === 'All' || transaction.status === transactionStatusFilter;
      const matchesPaymentMode = transactionPaymentModeFilter === 'All' || transaction.paymentMode === transactionPaymentModeFilter;
      const matchesDepartment = transactionDepartmentFilter === 'All' || transaction.departmentName === transactionDepartmentFilter;
      const matchesHandler = transactionHandlerFilter === 'All' || transaction.handledByName === transactionHandlerFilter;
      const matchesFromDate = !transactionDateFrom || transaction.date >= transactionDateFrom;
      const matchesToDate = !transactionDateTo || transaction.date <= transactionDateTo;

      return matchesQuery && matchesStatus && matchesPaymentMode && matchesDepartment && matchesHandler && matchesFromDate && matchesToDate;
    });
  }, [
    transactionDateFrom,
    transactionDateTo,
    transactionDepartmentFilter,
    transactionFilterQuery,
    transactionHandlerFilter,
    transactionPaymentModeFilter,
    transactionStatusFilter,
    visibleTransactionHistory,
  ]);

  const transactionSummary = useMemo(() => [
    { title: 'Total Volume', value: `Rs. ${transactionStats.totalVolume.toLocaleString('en-IN')}`, detail: 'Transactions this month', icon: <FaReceipt />, colorClass: 'bg-primary' },
    { title: 'Completed', value: `${transactionStats.completed}`, detail: 'Successfully processed', icon: <FaChartLine />, colorClass: 'bg-success' },
    { title: 'Pending', value: `${transactionStats.pending}`, detail: 'Waiting authorization', icon: <FaHourglassHalf />, colorClass: 'bg-warning' },
    { title: 'Adjusted', value: `${transactionStats.disputes}`, detail: 'Cancelled or refunded records', icon: <FaHistory />, colorClass: 'bg-danger' },
  ], [transactionStats]);

  const adminBusinessPlanRows = useMemo(() => (
    businesses.map((business) => {
      const accessState = getBusinessAccessState(business);
      const businessWorkspace = state.businessWorkspacesById[business.id];

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
  ), [businesses, state.businessWorkspacesById]);

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
    const normalizedQuery = adminPlanSearchQuery.trim().toLowerCase();

    return adminBusinessPlanRows.filter((row) => {
      const matchesQuery = !normalizedQuery || [
        row.businessName,
        row.businessPhone,
        row.businessEmail,
        row.planLabel,
      ].join(' ').toLowerCase().includes(normalizedQuery);
      const matchesPlan = adminPlanIdFilter === 'All' || row.planId === adminPlanIdFilter;
      const matchesPlanStatus = adminPlanStatusFilter === 'All' || row.planStatus === adminPlanStatusFilter;
      const matchesWorkspace = adminPlanWorkspaceFilter === 'All'
        || (adminPlanWorkspaceFilter === 'Active' ? row.workspaceStatus === 'Active' : row.workspaceStatus !== 'Active');
      const matchesExpiry = adminPlanExpiryFilter === 'All'
        || (adminPlanExpiryFilter === 'Expiring Soon' ? row.isExpiringSoon : false)
        || (adminPlanExpiryFilter === 'Expired' ? row.planStatus === 'expired' : false)
        || (adminPlanExpiryFilter === 'Cancelled' ? row.planStatus === 'cancelled' : false);

      return matchesQuery && matchesPlan && matchesPlanStatus && matchesWorkspace && matchesExpiry;
    });
  }, [
    adminBusinessPlanRows,
    adminPlanExpiryFilter,
    adminPlanIdFilter,
    adminPlanSearchQuery,
    adminPlanStatusFilter,
    adminPlanWorkspaceFilter,
  ]);

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
      defaultAccount: getDepartmentDefaultAccount(counter, accounts),
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
    setDepartmentSearchQuery(departmentSearchInput.trim().toLowerCase());
  };

  const clearDepartmentFilters = () => {
    setDepartmentSearchInput('');
    setDepartmentSearchQuery('');
    setDepartmentAccountStatusFilter('All');
  };

  const clearTransactionFilters = () => {
    setTransactionFilterQuery('');
    setTransactionStatusFilter('All');
    setTransactionPaymentModeFilter('All');
    setTransactionDepartmentFilter('All');
    setTransactionHandlerFilter('All');
    setTransactionDateFrom('');
    setTransactionDateTo('');
  };

  const clearAdminPlanFilters = () => {
    setAdminPlanSearchQuery('');
    setAdminPlanIdFilter('All');
    setAdminPlanStatusFilter('All');
    setAdminPlanWorkspaceFilter('All');
    setAdminPlanExpiryFilter('All');
  };

  const renderTransactionFilters = () => (
    <div id="transaction-filter-panel" className="col-12">
      <section className="panel department-toolbar">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Transaction Filters</p>
            <h2 className="panel-title">Find the right transaction quickly</h2>
            <p className="panel-copy">Search by transaction number, customer, service, payment mode, department, or employee, then narrow by status and date.</p>
          </div>
          <div className="panel-status-chip">
            Showing {filteredTransactionRecords.length} of {visibleTransactionHistory.length}
          </div>
        </div>

        <div className="department-toolbar__grid">
          <div className="app-field mb-0">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search transaction number, customer, service, department, or employee"
              value={transactionFilterQuery}
              onChange={(event) => setTransactionFilterQuery(event.target.value)}
            />
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={transactionStatusFilter}
              onChange={(event) => setTransactionStatusFilter(event.target.value as 'All' | 'completed' | 'pending' | 'cancelled' | 'refunded')}
            >
              <option value="All">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Payment Mode</label>
            <select
              className="form-select"
              value={transactionPaymentModeFilter}
              onChange={(event) => setTransactionPaymentModeFilter(event.target.value as 'All' | 'cash' | 'upi' | 'bank' | 'card')}
            >
              <option value="All">All</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
            </select>
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={transactionDepartmentFilter}
              onChange={(event) => setTransactionDepartmentFilter(event.target.value)}
            >
              <option value="All">All</option>
              {transactionDepartmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Handled By</label>
            <select
              className="form-select"
              value={transactionHandlerFilter}
              onChange={(event) => setTransactionHandlerFilter(event.target.value)}
            >
              <option value="All">All</option>
              {transactionHandlerOptions.map((handler) => (
                <option key={handler} value={handler}>
                  {handler}
                </option>
              ))}
            </select>
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Date From</label>
            <input
              type="date"
              className="form-control"
              value={transactionDateFrom}
              onChange={(event) => setTransactionDateFrom(event.target.value)}
            />
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Date To</label>
            <input
              type="date"
              className="form-control"
              value={transactionDateTo}
              onChange={(event) => setTransactionDateTo(event.target.value)}
            />
          </div>
          <div className="department-toolbar__actions">
            {canManageModule('transactions') ? (
              <button type="button" className="btn-app btn-app-primary" onClick={() => handleQuickAction('new-transaction')}>
                Add Transaction
              </button>
            ) : null}
            {canManageModule('transactions') ? (
              <button type="button" className="btn-app btn-app-secondary" onClick={() => handleQuickAction('export-transactions')}>
                Export
              </button>
            ) : null}
            <button type="button" className="btn-app btn-app-secondary" onClick={clearTransactionFilters}>
              Clear
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  const renderAdminPlanFilters = () => (
    <div id="admin-plan-filter-panel" className="col-12">
      <section className="panel department-toolbar">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Plan Filters</p>
            <h2 className="panel-title">Find the right subscription quickly</h2>
            <p className="panel-copy">Search by business, then narrow plan purchases by plan type, plan status, workspace access, and expiry window.</p>
          </div>
          <div className="panel-status-chip">
            Showing {filteredAdminPlanRows.length} of {adminBusinessPlanRows.length}
          </div>
        </div>

        <div className="department-toolbar__grid">
          <div className="app-field mb-0">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search business name, phone, email, or plan"
              value={adminPlanSearchQuery}
              onChange={(event) => setAdminPlanSearchQuery(event.target.value)}
            />
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Plan</label>
            <select
              className="form-select"
              value={adminPlanIdFilter}
              onChange={(event) => setAdminPlanIdFilter(event.target.value)}
            >
              <option value="All">All</option>
              {businessSubscriptionPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label}
                </option>
              ))}
            </select>
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Plan Status</label>
            <select
              className="form-select"
              value={adminPlanStatusFilter}
              onChange={(event) => setAdminPlanStatusFilter(event.target.value as 'All' | BusinessSubscription['status'])}
            >
              <option value="All">All</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Workspace Access</label>
            <select
              className="form-select"
              value={adminPlanWorkspaceFilter}
              onChange={(event) => setAdminPlanWorkspaceFilter(event.target.value as 'All' | 'Active' | 'Locked')}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Locked">Locked</option>
            </select>
          </div>
          <div className="app-field mb-0">
            <label className="form-label">Expiry Window</label>
            <select
              className="form-select"
              value={adminPlanExpiryFilter}
              onChange={(event) => setAdminPlanExpiryFilter(event.target.value as 'All' | 'Expiring Soon' | 'Expired' | 'Cancelled')}
            >
              <option value="All">All</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="department-toolbar__actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={clearAdminPlanFilters}>
              Clear
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  function startWorkflowWithDraft(
    draft: Omit<ServiceWorkflowDraft, 'token'>,
    options?: { departmentId?: string; notice?: string }
  ) {
    if (options?.departmentId && availableCounters.some((counter) => counter.id === options.departmentId)) {
      setSelectedCounterId(options.departmentId);
    }

    setWorkflowDraft({
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
    setActiveModal(null);
    setEditingBusiness(null);
    setSelectedPlanBusiness(null);
    setEditingService(null);
    setEditingCustomer(null);
    setEditingEmployee(null);
    setEditingDepartment(null);
    setEditingAccount(null);
    setEditingExpense(null);
    setEditingTransaction(null);
    setSelectedTransaction(null);
    setSelectedCustomerHistory(null);
    setSelectedHistoryEvent(null);
    setSelectedReport(null);
    setSelectedOption(null);
    setPendingDelete(null);
  };

  const addNotification = (type: 'success' | 'warning' | 'error' | 'info', message: string) => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      businessId: currentRole === 'Admin' ? undefined : currentUser.businessId,
      payload: { type, message },
    });
  };

  const getModuleLabel = (moduleId: string) => getModuleDisplayById(moduleId, currentRole)?.label || 'this module';

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

  const isBusinessEmailTaken = (email: string, excludedBusinessId?: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return false;
    if (normalizedEmail === 'admin@enest.com') return true;

    const businessConflict = state.businesses.some((business) =>
      normalizeEmail(business.email) === normalizedEmail && business.id !== excludedBusinessId
    );

    if (businessConflict) {
      return true;
    }

    return Object.values(state.businessWorkspacesById).some((tenantWorkspace) =>
      tenantWorkspace.employees.some((employee) => normalizeEmail(employee.email) === normalizedEmail)
    );
  };

  const isEmployeeEmailTaken = (email: string, excludedEmployeeId?: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return false;
    if (normalizedEmail === 'admin@enest.com') return true;

    const businessConflict = state.businesses.some((business) => normalizeEmail(business.email) === normalizedEmail);
    if (businessConflict) {
      return true;
    }

    return Object.values(state.businessWorkspacesById).some((tenantWorkspace) =>
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
    <div className="row g-4 mb-4 summary-grid">
      {cards.map((item) => (
        <div key={item.title} className="col-12 col-md-6 col-xl-3">
          <SummaryCard {...item} />
        </div>
      ))}
    </div>
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
            <button type="button" className="btn-app btn-app-primary" onClick={() => setActiveModal('manage-plan')}>
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
            <h1 className="hero-panel__headline">Oversee businesses, subscriptions, and renewal risk from one place.</h1>
            <p className="hero-panel__copy">
              Review every business workspace, monitor expiring plans, manage renewals, and keep admin alerts visible without the operator-only shortcuts.
            </p>

            <div className="section-hero__actions">
              <button type="button" className="btn-app btn-app-primary" onClick={() => openModule('customers')}>
                Open Business Directory
              </button>
              <button type="button" className="btn-app btn-app-secondary" onClick={() => openModule('reports')}>
                Open Reports
              </button>
            </div>

            <div className="hero-panel__meta">
              <div className="hero-stat">
                <span className="hero-stat__label">Businesses</span>
                <span className="hero-stat__value">{businesses.length}</span>
                <span className="hero-stat__hint">Managed from the admin workspace</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__label">Active Plans</span>
                <span className="hero-stat__value">
                  {adminBusinessPlanRows.filter((row) => row.planStatus === 'active' || row.planStatus === 'trial').length}
                </span>
                <span className="hero-stat__hint">Businesses with software access</span>
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

      {renderSummaryCards(adminDashboardSummary)}

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

      <div className="col-12">
        <SectionHero
          eyebrow="Manage Your Plans"
          title="Subscription purchase transactions"
          description="Business plan purchases replace the operator transaction feed here, with filters tailored to plan type, renewal state, and workspace access."
          action={{
            label: 'Business Directory',
            icon: <FaUsers />,
            onClick: () => openModule('customers'),
          }}
        />
      </div>

      {isAdminPlanFiltersOpen ? renderAdminPlanFilters() : null}

      <div className="col-12">
        <SubscriptionTransactionsTable
          rows={filteredAdminPlanRows}
          onManagePlan={handleManageBusinessPlan}
          onEditBusiness={handleEditCustomer}
          onToggleFilters={() => setIsAdminPlanFiltersOpen((current) => !current)}
          isFilterOpen={isAdminPlanFiltersOpen}
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

    setEditingAccount(account);
    setActiveModal('edit-account');
  };

  const handleEditService = (service: Service) => {
    if (!requireModuleAction('services', 'edit')) return;
    if (!ensureEmployeeDepartmentAccess('update services')) return;

    setEditingService(service);
    setActiveModal('edit-service');
  };

  const handleEditCustomer = (recordId: string) => {
    if (!requireModuleAction('customers', 'edit')) return;

    if (currentRole === 'Admin') {
      const business = businesses.find((item) => item.id === recordId);
      if (!business) return;

      setEditingBusiness(business);
    } else {
      const customer = workspace.customers.find((item) => item.id === recordId);
      if (!customer) return;

      setEditingCustomer(customer);
    }
    setActiveModal('edit-customer');
  };

  const handleEditEmployee = (employee: Employee) => {
    if (!requireModuleAction('employee', 'edit')) return;

    setEditingEmployee(employee);
    setActiveModal('edit-employee');
  };

  const handleEditDepartment = (counter: Counter) => {
    if (!requireModuleAction('departments', 'edit')) return;

    setEditingDepartment(counter);
    setActiveModal('edit-department');
  };

  const handleEditTransaction = (transaction: Transaction) => {
    if (!requireModuleAction('transactions', 'edit')) return;
    if (!ensureEmployeeDepartmentAccess('edit transactions')) return;

    setEditingTransaction(transaction);
    setActiveModal('edit-transaction');
  };

  const handleViewCustomerHistory = (recordId: string) => {
    if (currentRole === 'Admin') return;
    if (!requireModuleAccess('customers', 'view')) return;

    const customer = workspace.customers.find((item) => item.id === recordId);
    if (!customer) return;

    setSelectedCustomerHistory(customer);
    setActiveModal('view-customer-history');
  };

  const handleViewTransaction = (transaction: Transaction) => {
    if (!requireModuleAccess('transactions', 'view')) return;

    setSelectedTransaction(transaction);
    setActiveModal('view-transaction');
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

    if (transaction.status === 'cancelled') {
      addNotification('info', `${transaction.transactionNumber} is already cancelled.`);
      return;
    }

    const confirmed = window.confirm(`Cancel transaction ${transaction.transactionNumber} for ${transaction.customerName}?`);
    if (!confirmed) return;

    dispatch({
      type: 'UPDATE_TRANSACTION',
      businessId,
      payload: {
        ...transaction,
        paidAmount: 0,
        dueAmount: 0,
        status: 'cancelled',
        note: transaction.note
          ? `${transaction.note} | Cancelled by ${displayUserName}`
          : `Cancelled by ${displayUserName}`,
      },
    });
    addHistoryEvent(`Transaction ${transaction.transactionNumber} cancelled for ${transaction.customerName}`, 'Transactions', 'Failed');
    addNotification('warning', `Transaction ${transaction.transactionNumber} cancelled.`);
    closeModal();
  };

  const handleViewHistory = (event: HistoryEvent) => {
    if (!requireModuleAccess('history', 'view')) return;

    setSelectedHistoryEvent(event);
    setActiveModal('view-history');
  };

  const handleViewReport = (report: ReportItem) => {
    if (!requireModuleAccess('reports', 'view')) return;

    setSelectedReport(report);
    setActiveModal('view-report');
  };

  const handleConfigureOption = (option: AdditionOption) => {
    if (!requireModuleManagement('additions', 'configure')) return;

    setSelectedOption(option);
    setActiveModal('configure-option');
  };

  const handleEditExpense = (expense: Expense) => {
    if (!requireModuleAction('expense', 'edit')) return;

    setEditingExpense(expense);
    setActiveModal('edit-expense');
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
        module: 'Businesses',
      },
      DELETE_ACCOUNT: {
        actionType,
        id,
        label: accounts.find((account) => account.id === id)?.accountHolder || 'this account',
        module: 'Accounts',
      },
      DELETE_SERVICE: {
        actionType,
        id,
        label: services.find((service) => service.id === id)?.name || 'this service',
        module: 'Services',
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
        module: 'Employees',
      },
      DELETE_COUNTER: {
        actionType,
        id,
        label: counters.find((counter) => counter.id === id)?.name || 'this department',
        module: 'Department',
      },
      DELETE_EXPENSE: {
        actionType,
        id,
        label: expenses.find((expense) => expense.id === id)?.title || 'this expense',
        module: 'Expense',
      },
      DELETE_TRANSACTION: {
        actionType,
        id,
        label: transactionHistory.find((transaction) => transaction.id === id)?.customerName || 'this transaction',
        module: 'Transactions',
      },
      DELETE_HISTORY_EVENT: {
        actionType,
        id,
        label: historyEvents.find((event) => event.id === id)?.title || 'this history record',
        module: 'History',
      },
      DELETE_REPORT: {
        actionType,
        id,
        label: reports.find((report) => report.id === id)?.name || 'this report',
        module: 'Reports',
      },
      DELETE_ADDITION_OPTION: {
        actionType,
        id,
        label: additionOptions.find((option) => option.id === id)?.title || 'this setting',
        module: 'System Settings',
      },
    };

    setPendingDelete(deleteDetails[actionType]);
    setActiveModal('confirm-delete');
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

        setActiveModal('favorites');
        break;
      case 'add-service':
        if (!requireModuleAction('services', 'add')) return;
        if (!ensureEmployeeDepartmentAccess('create services')) return;

        openModule('services');
        setActiveModal('add-service');
        break;
      case 'add-customer':
        if (!requireModuleAction('customers', 'add')) return;

        openModule('customers');
        setActiveModal('add-customer');
        break;
      case 'add-account':
        if (!requireModuleAction('accounts', 'add')) return;

        openModule('accounts');
        setActiveModal('add-account');
        break;
      case 'add-employee':
        if (!requireModuleAction('employee', 'add')) return;

        openModule('employee');
        setActiveModal('add-employee');
        break;
      case 'add-department':
        if (!requireModuleAction('departments', 'add')) return;

        openModule('departments');
        setActiveModal('add-department');
        break;
      case 'add-expense':
        if (!requireModuleAction('expense', 'add')) return;

        openModule('expense');
        setActiveModal('add-expense');
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
        setActiveModal('manage-options');
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

  const handleBusinessSubmit = (values: BusinessFormValues) => {
    if (!requireModuleAction('customers', editingBusiness ? 'edit' : 'add')) return;

    if (Object.values(values.permissions).every((enabled) => !enabled)) {
      addNotification('warning', 'Select at least one permission before saving the business.');
      return;
    }

    if (isBusinessEmailTaken(values.email, editingBusiness?.id)) {
      addNotification('error', 'That business email is already assigned to another login.');
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
      return;
    }
    const targetAccessState = getBusinessAccessState(targetBusiness);

    const confirmed = window.confirm(`Cancel the current plan for ${targetBusiness.name || 'this business workspace'}?`);
    if (!confirmed) return;

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

    setSelectedPlanBusiness(business);
    setActiveModal('manage-plan');
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

    const placeholderDepartment = counters.find(isDefaultSeedDepartment);
    const hasConfiguredDepartment = counters.some((counter) => !isDefaultSeedDepartment(counter));
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

    if (!hasConfiguredDepartment && placeholderDepartment) {
      dispatch({
        type: 'UPDATE_COUNTER',
        businessId,
        payload: {
          ...placeholderDepartment,
          ...departmentPayload,
        },
      });
      return;
    }

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

    const placeholderAccount = accounts.find(isDefaultSeedAccount);
    const hasConfiguredAccount = accounts.some((account) => !isDefaultSeedAccount(account));

    if (!hasConfiguredAccount && placeholderAccount) {
      dispatch({
        type: 'UPDATE_ACCOUNT',
        businessId,
        payload: {
          ...placeholderAccount,
          ...values,
          openingBalance: 0,
          currentBalance: 0,
          status: 'Active',
          date: placeholderAccount.date,
        },
      });
      return;
    }

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

    const updatedTransaction: Transaction = {
      ...editingTransaction,
      ...values,
    };

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
    if (!selectedOption) return;
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
    setFavoriteServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  const renderDetails = (rows: Array<[string, React.ReactNode]>) => (
    <div className="detail-list">
      {rows.map(([label, value]) => (
        <div key={label} className="detail-row">
          <span className="detail-label">{label}</span>
          <span className="detail-value">{value}</span>
        </div>
      ))}
    </div>
  );

  const renderPermissionDenied = (moduleId: string) => (
    <div className="row g-4">
      <div className="col-12">
        <div className="panel p-5 text-center">
            <div className="delete-confirm-icon mx-auto mb-3">
              <FaExclamationTriangle />
            </div>
            <p className="eyebrow mb-2">Access Restricted</p>
            <h2 className="h4 fw-semibold mb-2">{getRoleLabel(currentRole)} cannot open {getModuleLabel(moduleId)}</h2>
            <p className="page-muted mb-4">
              This page is protected by the role rules in the platform structure.
            </p>
            <button type="button" className="btn-app btn-app-primary" onClick={() => openModule('dashboard')}>
              Go To Dashboard
            </button>
        </div>
      </div>
    </div>
  );

  const renderCustomerRoutePermissionState = () => {
    const message = currentRole === 'Admin'
      ? 'The admin workspace only supports the business directory on customer routes. Open Business List to keep working in this section.'
      : customerPageOptions.length > 0
        ? 'This URL points to a customer view your current permissions do not allow. Choose one of the customer pages available to your role.'
        : 'This business can still add customers, but the customer list views stay hidden until their permissions are turned on.';

    return (
      <section className="panel p-4">
        <p className="eyebrow mb-2">Customer Route</p>
        <h3 className="h5 fw-semibold mb-2">{requestedCustomerPageCopy.label} is unavailable</h3>
        <p className="page-muted mb-3">{message}</p>
        {customerPageOptions.length > 0 ? (
          <div className="d-flex flex-wrap gap-2">
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
        ) : (
          <button type="button" className="btn-app btn-app-primary" onClick={() => openModule('dashboard')}>
            Go To Dashboard
          </button>
        )}
      </section>
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

        {totalResults === 0 && (
          <div className="col-12">
            <div className="panel p-5 text-center page-muted">
                No matching records found.
            </div>
          </div>
        )}

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

    if (activeModal === 'manage-plan') {
      const planTargetBusiness = currentRole === 'Customer' ? currentBusiness : selectedPlanBusiness;
      const planTargetAccessState = planTargetBusiness ? getBusinessAccessState(planTargetBusiness) : null;

      if (!planTargetBusiness || !planTargetAccessState) {
        return null;
      }

      return (
        <ActionModal
          title="Manage Plan"
          eyebrow="Subscription"
          description={
            currentRole === 'Admin'
              ? `Update the dummy subscription plan for ${planTargetBusiness.name}.`
              : 'Change the dummy subscription plan that controls this business workspace.'
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
                ? handlePlanCancel
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
                ? 'Update business contact details, credentials, and workspace permissions.'
                : 'Create a business profile, assign login credentials, and choose the workspace permissions it should receive.'
              : editingCustomer
                ? 'Update customer details used inside the business workspace.'
                : 'Save customer details once and reuse them during service processing.'
          }
          onClose={closeModal}
        >
          {currentRole === 'Admin' ? (
            <BusinessForm
              initialValues={editingBusiness || undefined}
              submitLabel={editingBusiness ? 'Update Business' : 'Add Business'}
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
      return (
        <ActionModal
          title="Confirm Delete"
          eyebrow={pendingDelete.module}
          description="This action removes the record from the current dashboard data."
          tone="danger"
          onClose={closeModal}
        >
          <div className="d-flex align-items-start gap-3">
            <div className="delete-confirm-icon">
              <FaExclamationTriangle />
            </div>
            <div>
              <h3 className="h5 fw-semibold mb-2">Delete {pendingDelete.label}?</h3>
              <p className="page-muted mb-0">
                This keeps the workflow simple while still protecting the team from accidental clicks.
              </p>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={closeModal}>Cancel</button>
            <button type="button" className="btn-app btn-app-danger" onClick={confirmDeleteRecord}>Delete Record</button>
          </div>
        </ActionModal>
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
          {renderDetails([
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
          ])}
          <div className="modal-actions">
            {canPerformModuleAction('transactions', 'edit') ? (
              <button
                type="button"
                className="btn-app btn-app-secondary"
                onClick={() => {
                  setEditingTransaction(selectedTransaction);
                  setActiveModal('edit-transaction');
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
            {selectedTransaction.status !== 'cancelled' ? (
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
              {renderDetails([
                ['Customer', selectedCustomerHistory.name],
                ['Phone', selectedCustomerHistory.phone],
                ['Email', selectedCustomerHistory.email || 'Not added'],
                ['Status', selectedCustomerHistory.status || 'Active'],
              ])}
            </div>
            <div className="col-12 col-md-6">
              {renderDetails([
                ['Transactions', selectedCustomerSummary.totalTransactions],
                ['Gross Amount', `Rs. ${selectedCustomerSummary.grossAmount.toLocaleString('en-IN')}`],
                ['Collected Amount', `Rs. ${selectedCustomerSummary.collectedAmount.toLocaleString('en-IN')}`],
                ['Outstanding Amount', `Rs. ${selectedCustomerSummary.outstandingAmount.toLocaleString('en-IN')}`],
                ['Last Visit', selectedCustomerSummary.lastVisit],
              ])}
            </div>
          </div>
          <div className="table-panel mb-4">
            <div className="table-panel__header">
              <div>
                <p className="eyebrow">Customer Ledger</p>
                <h3 className="table-panel__title">Transaction history</h3>
                <p className="table-panel__copy">All saved service transactions for this customer.</p>
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="table data-table align-middle">
                <thead>
                  <tr>
                    <th>Txn No.</th>
                    <th>Service</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomerTransactions.length === 0 ? (
                    <tr>
                      <td className="table-empty" colSpan={7}>No transaction history found for this customer.</td>
                    </tr>
                  ) : (
                    selectedCustomerTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.transactionNumber}</td>
                        <td>{transaction.service}</td>
                        <td>Rs. {transaction.totalAmount.toLocaleString('en-IN')}</td>
                        <td>Rs. {transaction.paidAmount.toLocaleString('en-IN')}</td>
                        <td>Rs. {transaction.dueAmount.toLocaleString('en-IN')}</td>
                        <td>{transaction.status}</td>
                        <td>{transaction.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
          {renderDetails([
            ['Event', selectedHistoryEvent.title],
            ['Module', selectedHistoryEvent.module],
            ['Actor', selectedHistoryEvent.actor],
            ['Status', selectedHistoryEvent.status],
            ['Date', selectedHistoryEvent.date],
          ])}
        </ActionModal>
      );
    }

    if (activeModal === 'view-report' && selectedReport) {
      return (
        <ActionModal title="Report Details" onClose={closeModal}>
          {renderDetails([
            ['Report', selectedReport.name],
            ['Type', selectedReport.type],
            ['Owner', selectedReport.owner],
            ['Status', selectedReport.status],
            ['Date', selectedReport.date],
          ])}
          {selectedReport.summary ? (
            <div className="form-section-card mt-4">
              <div className="form-section-title mb-3">Daily Closing Snapshot</div>
              {renderDetails([
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
              ])}
            </div>
          ) : null}
        </ActionModal>
      );
    }

    if (activeModal === 'configure-option' && selectedOption) {
      return (
        <ActionModal title="Configure Option" onClose={closeModal}>
          {renderDetails([
            ['Option', selectedOption.title],
            ['Category', selectedOption.category],
            ['Current Status', selectedOption.status],
            ['Description', selectedOption.description],
          ])}
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={closeModal}>Cancel</button>
            <button type="button" className="btn-app btn-app-primary" onClick={handleToggleOption}>
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

  const renderContent = () => {
    if (isBusinessSubscriptionLocked) {
      return (
        <div className="row g-4">
          {renderBusinessPlanSection(true)}
        </div>
      );
    }

    if (!canAccessModuleForSession(accessContext, activeTab)) {
      return renderPermissionDenied(activeTab);
    }

    switch (activeTab) {
      case 'dashboard': {
        if (currentRole === 'Admin') {
          return renderAdminDashboard();
        }

        const isBusinessWorkspace = currentRole === 'Customer';

        const serviceSnapshotSection = canAccessModuleForSession(accessContext, 'services') ? (
          <div className="col-12">
            <div className="panel p-4 p-lg-5">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Service Snapshot</p>
                  <h2 className="panel-title">Most-used services</h2>
                  <p className="panel-copy">
                    {selectedCounter
                      ? `A quick glance at the live services available in ${selectedCounter.name}.`
                      : 'A quick glance at the live services operators can open right away.'}
                  </p>
                </div>
                {canManageModule('services') && canEmployeeOperateOnDepartment ? (
                  <button type="button" className="btn-app btn-app-primary" onClick={() => handleQuickAction('add-service')}>
                    <FaPlusCircle />
                    Add Service
                  </button>
                ) : null}
              </div>
              <div className="row g-4">
                {visibleServices.slice(0, 3).map((service) => (
                  <div key={service.id} className="col-12 col-md-6 col-xl-4">
                    <div className="metric-card summary-card--blue">
                      <div className="d-flex justify-content-between gap-3">
                        <span className="status-chip status-chip--info">{service.category}</span>
                        <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                          {service.status}
                        </span>
                      </div>
                      <h3 className="h5 fw-semibold mt-4 mb-2">{service.name}</h3>
                      <p className="metric-card__detail mb-4">{service.description}</p>
                      <div className="d-flex justify-content-between align-items-center gap-3">
                        <span className="fw-semibold text-primary">Rs. {service.price.toLocaleString('en-IN')}</span>
                        <div className="table-actions">
                          {canManageModule('services') ? (
                            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => handleEditService(service)}>
                              Edit
                            </button>
                          ) : null}
                          {canDeleteModule('services') ? (
                            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => handleDeleteService(service.id)}>
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;

        const recentActivitySection = (
          <>
            <div className="col-12">
              <SectionHero
                eyebrow="Recent Activity"
                title="Counters and latest services"
                description="Keep an eye on active balances and the newest services processed by the team."
              />
            </div>

            <div className="col-12">
              <div className="row g-4">
                <div className="col-12 col-lg-6">
                  <CountersTable counters={availableCounters} />
                </div>
                {canAccessModuleForSession(accessContext, 'services') && (
                  <div className="col-12 col-lg-6">
                    <RecentServicesTable services={recentServices} />
                  </div>
                )}
              </div>
            </div>
          </>
        );

        return (
          <div className="row g-4">
            <div className="col-12">
              <WelcomeHero
                userName={displayUserName}
                role={currentRole}
                counterName={selectedCounter?.name || 'No counter selected'}
                counterStatus={selectedCounter?.status || 'Inactive'}
                onPrimaryAction={() => handleQuickAction('new-transaction')}
                onSecondaryAction={() => handleQuickAction('favorites')}
              />
            </div>

            {isBusinessWorkspace ? renderBusinessPlanSection() : null}
            {isBusinessWorkspace ? null : serviceSnapshotSection}

            <div className="col-12">
              <div className="panel p-4 p-lg-5">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Today Overview</p>
                    <h2 className="panel-title">Operating pulse</h2>
                  </div>
                </div>
                <div className="row g-4">
                  <div className="col-12 col-sm-6 col-lg-3">
                    <DashboardCard
                      title="Today Earnings"
                      value="Rs. 1,250"
                      icon={<FaDollarSign />}
                      trend={{ value: 12, isPositive: true }}
                      color="green"
                    />
                  </div>
                  <div className="col-12 col-sm-6 col-lg-3">
                    <DashboardCard
                      title="Pending Tasks"
                      value="8"
                      icon={<FaHourglassHalf />}
                      trend={{ value: 5, isPositive: false }}
                      color="orange"
                    />
                  </div>
                  <div className="col-12 col-sm-6 col-lg-3">
                    <DashboardCard
                      title="Active Users"
                      value="24"
                      icon={<FaUsers />}
                      color="blue"
                    />
                  </div>
                  <div className="col-12 col-sm-6 col-lg-3">
                    <DashboardCard
                      title="Total Transactions"
                      value="156"
                      icon={<FaChartLine />}
                      trend={{ value: 8, isPositive: true }}
                      color="purple"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="row g-4">
                <div className="col-12 col-lg-6 dashboard-balance-col">
                  <QuickActions onAction={handleQuickAction} />
                </div>
                <div className="col-12 col-lg-6 dashboard-balance-col">
                  <NotificationCenter
                    notifications={notifications}
                    onDismiss={handleDismissNotification}
                  />
                </div>
              </div>
            </div>

            {isBusinessWorkspace ? null : recentActivitySection}

            <div className="col-12">
              <SectionHero
                eyebrow="Transactions"
                title="Transaction history"
                description="Review recent customer activity and open a record when you need more detail."
                action={canManageModule('transactions') && canEmployeeOperateOnDepartment ? {
                  label: 'Add Transaction',
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('new-transaction'),
                } : undefined}
              />
            </div>

            {isTransactionFiltersOpen ? renderTransactionFilters() : null}

            <div className="col-12">
              <TransactionTable
                transactions={filteredTransactionRecords}
                onView={handleViewTransaction}
                onDelete={canDeleteModule('transactions') ? (id) => handleDeleteRecord('DELETE_TRANSACTION', id) : undefined}
                onToggleFilters={() => setIsTransactionFiltersOpen((current) => !current)}
                isFilterOpen={isTransactionFiltersOpen}
              />
            </div>

            {isBusinessWorkspace ? serviceSnapshotSection : null}
            {isBusinessWorkspace ? recentActivitySection : null}
          </div>
        );
      }
      case 'services':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Service Catalog"
                title="Manage your live services"
                description={
                  selectedCounter
                    ? `Track active offerings, pricing, and service status for ${selectedCounter.name}.`
                    : 'Track active offerings, pricing, and service status with the latest metrics.'
                }
                action={canManageModule('services') && canEmployeeOperateOnDepartment ? {
                  label: 'Add Service',
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('add-service'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(serviceSummary)}

            <div className="col-12">
              <ServicesTable
                services={visibleServices}
                onEdit={canManageModule('services') ? handleEditService : undefined}
                onDelete={canDeleteModule('services') ? (id) => handleDeleteRecord('DELETE_SERVICE', id) : undefined}
              />
            </div>
          </div>
        );
      case 'customers':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow={currentRole === 'Admin' ? 'Business Hub' : 'Customer Hub'}
                title={customerSectionTitle}
                description={customerSectionDescription}
                action={canAddCustomerRecords ? {
                  label: `Add ${customerEntityLabel}`,
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('add-customer'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(customerSummary)}

            {currentRole !== 'Admin' && customerPageOptions.length > 0 ? (
              <div className="col-12">
                <section className="panel p-4">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Customer Options</p>
                      <h2 className="panel-title">Choose what you want to review</h2>
                      <p className="panel-copy">Switch between the customer directory, payment list, and outstanding balances based on your assigned permissions.</p>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {customerPageOptions.map((option) => (
                      <Link
                        key={option.id}
                        href={getCustomerWorkspacePath(option.id)}
                        className={customerPageView === option.id ? 'btn-app btn-app-primary' : 'btn-app btn-app-secondary'}
                      >
                        {option.label}
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {currentRole === 'Admin' ? (
              <div className="col-12">
                <section className="panel department-toolbar">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Business Filters</p>
                      <h2 className="panel-title">Filter businesses by permission</h2>
                      <p className="panel-copy">See which business logins were granted a specific permission before you edit access.</p>
                    </div>
                    <div className="panel-status-chip">
                      Showing {filteredBusinesses.length} of {businesses.length}
                    </div>
                  </div>
                  <div className="department-toolbar__grid">
                    <div className="app-field mb-0">
                      <label className="form-label">Permission</label>
                      <select
                        className="form-select"
                        value={businessPermissionFilter}
                        onChange={(event) => setBusinessPermissionFilter(event.target.value)}
                      >
                        <option value="all">All permissions</option>
                        {customerPermissionOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="department-toolbar__actions">
                      <button
                        type="button"
                        className="btn-app btn-app-secondary"
                        onClick={() => setBusinessPermissionFilter('all')}
                        disabled={businessPermissionFilter === 'all'}
                      >
                        Clear Filter
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}

            <div className="col-12">
              {!hasRequestedCustomerPageAccess ? (
                renderCustomerRoutePermissionState()
              ) : canViewCustomerRecords ? (
                currentRole === 'Admin' || customerPageView === 'list' ? (
                  <CustomersTable
                    customers={customerDirectoryRecords}
                    eyebrow={customerEntityPlural}
                    title={currentRole === 'Admin' ? 'Business directory' : 'Customer directory'}
                    copy={currentRole === 'Admin' ? `Business records, login status, and permission access. Current filter: ${businessPermissionFilterLabel}.` : 'Contact details and profile status used across service workflows.'}
                    entityLabel={customerEntityLabel}
                    emptyLabel={`No ${customerEntityLabel.toLowerCase()} records found.`}
                    onView={currentRole === 'Admin' ? undefined : handleViewCustomerHistory}
                    onEdit={canEditCustomerRecords ? handleEditCustomer : undefined}
                    onDelete={canDeleteCustomerRecords ? (id) => handleDeleteRecord(currentRole === 'Admin' ? 'DELETE_BUSINESS' : 'DELETE_CUSTOMER', id) : undefined}
                  />
                ) : customerPageView === 'payments' ? (
                  <CustomerPaymentsTable transactions={customerPaymentTransactions} onView={handleViewTransaction} />
                ) : (
                  <CustomerOutstandingTable rows={customerOutstandingRows} onView={handleViewCustomerHistory} />
                )
              ) : (
                <section className="panel p-4">
                  <p className="eyebrow mb-2">Customer Directory</p>
                  <h3 className="h5 fw-semibold mb-2">Customer list access is disabled</h3>
                  <p className="page-muted mb-0">
                    This business can still add customers, but the customer list, payment list, and outstanding options stay hidden until those permissions are turned on.
                  </p>
                </section>
              )}
            </div>
          </div>
        );
      case 'reminder':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Reminder Center"
                title="Track alerts and follow-ups"
                description="Review notifications, failed events, and pending updates without leaving the main workflow."
                action={{
                  label: historyStatusFilter === 'All' ? 'Show Failed' : 'Show All',
                  icon: <FaHistory />,
                  onClick: () => handleQuickAction('filter-history'),
                }}
              />
            </div>

            {renderSummaryCards(reminderSummary)}

            <div className="col-12 col-xl-5">
              <NotificationCenter
                notifications={notifications}
                onDismiss={handleDismissNotification}
              />
            </div>

            <div className="col-12 col-xl-7">
              <HistoryTable
                events={filteredHistoryEvents}
                onView={handleViewHistory}
                onDelete={canDeleteModule('history') ? (id) => handleDeleteRecord('DELETE_HISTORY_EVENT', id) : undefined}
              />
            </div>
          </div>
        );
      case 'employee':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Employee Hub"
                title="Manage your employee directory"
                description="Add, update, and remove employee records from the business workspace."
                action={canAddEmployeeRecords ? {
                  label: 'Add Employee',
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('add-employee'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(employeeSummary)}

            <div className="col-12">
              {canViewEmployeeRecords ? (
                <EmployeesTable
                  departments={counters}
                  employees={employees}
                  onEdit={canEditEmployeeRecords ? handleEditEmployee : undefined}
                  onDelete={canDeleteEmployeeRecords ? (id) => handleDeleteRecord('DELETE_EMPLOYEE', id) : undefined}
                />
              ) : (
                <section className="panel p-4">
                  <p className="eyebrow mb-2">Employee Directory</p>
                  <h3 className="h5 fw-semibold mb-2">Employee list access is disabled</h3>
                  <p className="page-muted mb-0">
                    Add Employee can stay enabled on its own, but the directory list only appears when an employee list, salary, or outstanding permission is available.
                  </p>
                </section>
              )}
            </div>
          </div>
        );
      case 'departments':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Department Hub"
                title="Manage departments and linked counters"
                description="Add departments, map them to accounts, and review balances with search and account-status filters."
                action={canAddDepartmentRecords ? {
                  label: 'Add Department',
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('add-department'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(departmentSummary)}

            <div className="col-12">
              <section className="panel department-toolbar">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Search and Filter</p>
                    <h2 className="panel-title">Find the right department quickly</h2>
                    <p className="panel-copy">Search by department, code, account holder, bank, or account number, then filter by linked account status.</p>
                  </div>
                  <div className="panel-status-chip">
                    Showing {filteredDepartments.length} of {counters.length}
                  </div>
                </div>

                <form
                  className="department-toolbar__grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleDepartmentSearch();
                  }}
                >
                  <div className="app-field mb-0">
                    <label className="form-label">Search</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search departments, account holder, bank, or account number"
                      value={departmentSearchInput}
                      onChange={(event) => setDepartmentSearchInput(event.target.value)}
                    />
                  </div>
                  <div className="app-field mb-0">
                    <label className="form-label">Account Status</label>
                    <select
                      className="form-select"
                      value={departmentAccountStatusFilter}
                      onChange={(event) => setDepartmentAccountStatusFilter(event.target.value as 'All' | 'Active' | 'Inactive' | 'Unassigned')}
                    >
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  </div>
                  <div className="department-toolbar__actions">
                    <button type="submit" className="btn-app btn-app-primary">Search</button>
                    <button type="button" className="btn-app btn-app-secondary" onClick={clearDepartmentFilters}>Clear</button>
                  </div>
                </form>
              </section>
            </div>

            <div className="col-12">
              <DepartmentsTable
                accounts={accounts}
                counters={filteredDepartments.map((row) => row.counter)}
                onEdit={canEditDepartmentRecords ? handleEditDepartment : undefined}
                onDelete={canDeleteDepartmentRecords ? (id) => handleDeleteRecord('DELETE_COUNTER', id) : undefined}
              />
            </div>
          </div>
        );
      case 'accounts':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Account"
                title="Manage bank account records"
                description="Review account holders, bank details, IFSC codes, balances, and status from one table."
                action={canAddAccountRecords ? {
                  label: 'Add Account',
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('add-account'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(accountSummary)}

            <div className="col-12">
              <AccountsTable
                accounts={accounts}
                onEdit={canEditAccountRecords ? handleEditAccount : undefined}
                onDelete={canDeleteAccountRecords ? (id) => handleDeleteRecord('DELETE_ACCOUNT', id) : undefined}
              />
            </div>
          </div>
        );
      case 'transactions':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Transactions"
                title="Review recent activity"
                description="A clear view of completed, pending, and disputed payment flows."
                action={canManageModule('transactions') ? {
                  label: 'Add Transaction',
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('new-transaction'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(transactionSummary)}

            <div id="service-workflow" className="col-12">
              {currentRole === 'Employee' && !employeeAssignedDepartment ? (
                <div className="panel p-4 h-100">
                  <p className="eyebrow mb-2">Service Workflow</p>
                  <h3 className="h5 fw-semibold mb-2">Department assignment required</h3>
                  <p className="page-muted mb-0">
                    Assign this employee to a department before they can create transactions or post service payments.
                  </p>
                </div>
              ) : canManageModule('transactions') ? (
                <ServiceForm
                  key={`${workflowDraft?.token || 'service-workflow-form'}:${selectedCounter?.id || 'no-department'}`}
                  availableDepartments={availableCounters}
                  businessId={currentUser.businessId || ''}
                  selectedDepartment={selectedCounter}
                  actor={{
                    id: currentUser.id,
                    name: displayUserName,
                    role: currentRole === 'Employee' ? 'Employee' : 'Customer',
                  }}
                  draft={workflowDraft}
                />
              ) : (
                <div className="panel p-4 h-100">
                  <p className="eyebrow mb-2">Service Workflow</p>
                  <h3 className="h5 fw-semibold mb-2">Transaction entry is restricted</h3>
                  <p className="page-muted mb-0">
                    {getRoleLabel(currentRole)} can view allowed information, but cannot create service transactions.
                  </p>
                </div>
              )}
            </div>

            {isTransactionFiltersOpen ? renderTransactionFilters() : null}

            <div className="col-12">
              <TransactionTable
                transactions={filteredTransactionRecords}
                onEdit={canPerformModuleAction('transactions', 'edit') ? handleEditTransaction : undefined}
                onView={handleViewTransaction}
                onDelete={canDeleteModule('transactions') ? (id) => handleDeleteRecord('DELETE_TRANSACTION', id) : undefined}
                onToggleFilters={() => setIsTransactionFiltersOpen((current) => !current)}
                isFilterOpen={isTransactionFiltersOpen}
              />
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="System History"
                title="Track past activity"
                description="Review audit logs, events, and history details for every important change."
                action={canAccessModuleForSession(accessContext, 'history') ? {
                  label: historyStatusFilter === 'All' ? 'Show Failed' : 'Show All',
                  icon: <FaHistory />,
                  onClick: () => handleQuickAction('filter-history'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(historySummary)}

            <div className="col-12">
              <HistoryTable
                events={filteredHistoryEvents}
                onView={handleViewHistory}
                onDelete={canDeleteModule('history') ? (id) => handleDeleteRecord('DELETE_HISTORY_EVENT', id) : undefined}
              />
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Reports Center"
                title="Make data-driven decisions"
                description="View the latest insights, exports, and engagement summaries."
                action={canManageModule('reports') ? {
                  label: 'Generate',
                  icon: <FaChartLine />,
                  onClick: () => handleQuickAction('generate-report'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(reportSummary)}

            <div className="col-12">
              <ReportsTable
                reports={reports}
                onView={handleViewReport}
                onDelete={canDeleteModule('reports') ? (id) => handleDeleteRecord('DELETE_REPORT', id) : undefined}
              />
            </div>
          </div>
        );
      case 'expense':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Expense"
                title="Keep expense reporting in one place"
                description="Track expense entries, categories, and status from the business workspace."
                action={canManageModule('expense') ? {
                  label: 'Add Expense',
                  icon: <FaPlusCircle />,
                  onClick: () => handleQuickAction('add-expense'),
                } : undefined}
              />
            </div>

            {renderSummaryCards(expenseSummary)}

            <div className="col-12">
              <ExpensesTable
                expenses={expenses}
                onEdit={canManageModule('expense') ? handleEditExpense : undefined}
                onDelete={canDeleteModule('expense') ? (id) => handleDeleteRecord('DELETE_EXPENSE', id) : undefined}
              />
            </div>
          </div>
        );
      case 'additions':
        return (
          <div className="row g-4">
            <div className="col-12">
              <SectionHero
                eyebrow="Configuration Options"
                title="Fine tune system behavior"
                description="Use these advanced controls to update rules, reports, and integration settings."
                action={canManageModule('additions') ? {
                  label: 'Manage Options',
                  icon: <FaCog />,
                  onClick: () => handleQuickAction('update-options'),
                } : undefined}
              />
            </div>

            <div className="col-12">
              <AdditionsTable
                options={additionOptions}
                onConfigure={canManageModule('additions') ? handleConfigureOption : undefined}
                onDelete={canDeleteModule('additions') ? (id) => handleDeleteRecord('DELETE_ADDITION_OPTION', id) : undefined}
              />
            </div>
          </div>
        );
      default:
        return <div>Dashboard</div>;
    }
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
        canAddMoreDepartments={isPermissionEnabled(sessionPermissions, 'master.department_manage')}
        canAddMoreAccounts={isPermissionEnabled(sessionPermissions, 'master.account_manage')}
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
          counters={availableCounters}
          selectedCounterId={safeSelectedCounterId}
          notificationCount={notifications.length}
          searchValue={searchQuery}
          currentUser={{ ...currentUser, name: displayUserName }}
          onLogout={onLogout}
          onCounterChange={setSelectedCounterId}
          onSearch={handleSearch}
          onNotificationsClick={() => setActiveModal('notifications')}
          isSidebarOpen={isSidebarOpen}
          onSidebarToggle={toggleSidebar}
        />
        <main className="dashboard-content">
          <div className="content-container">
            {isBusinessSubscriptionLocked ? renderContent() : normalizedSearchQuery ? renderSearchResults() : renderContent()}
          </div>
        </main>
        <Footer />
      </div>
      {renderModal()}
    </div>
  );
};

export default Dashboard;
