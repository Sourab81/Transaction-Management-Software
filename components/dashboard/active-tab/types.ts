import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { SessionUser } from '../../../lib/auth-session';
import type { DashboardSummary } from '../../../lib/mappers/dashboard-summary-mapper';
import type { SessionAccessContext } from '../../../lib/platform-structure';
import type { RoleTemplate } from '../../../lib/types/role-template';
import type {
  Account,
  AdditionOption,
  Business,
  BusinessCustomer,
  Counter,
  Employee,
  Expense,
  HistoryEvent,
  Notification,
  RecentService,
  ReportItem,
  Service,
  Transaction,
} from '../../../lib/store';
import type { CustomerWorkspaceView } from '../../../lib/workspace-routes';
import type { ServiceWorkflowDraft } from '../../forms/ServiceForm';
import type { DataTablePagination } from '../../tables/DataTable';
import type { DataTableFiltersValue } from '../../common/DataTableFilters';
import type { CustomerOutstandingRow } from '../../tables/CustomerOutstandingTable';
import type { SummaryCardProps } from '../SummaryCard';

export interface CustomerPageOption {
  id: CustomerWorkspaceView;
  label: string;
  description: string;
}

export interface DepartmentTableRow {
  counter: Counter;
  linkedAccounts: Account[];
  defaultAccount: Account | null;
}

export type DashboardDeleteActionType =
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

export interface DashboardTabContext {
  currentRole: SessionUser['role'];
  currentUser: SessionUser;
  dashboardSummary: DashboardSummary | null;
  isDashboardSummaryLoading: boolean;
  currentBusinessProfile: Business | null;
  currentEmployeeProfile: Employee | null;
  accessContext: SessionAccessContext;
  selectedCounter: Counter | null;
  availableCounters: Counter[];
  visibleServices: Service[];
  recentServices: RecentService[];
  notifications: Notification[];
  businesses: Business[];
  accounts: Account[];
  employees: Employee[];
  counters: Counter[];
  reports: ReportItem[];
  expenses: Expense[];
  additionOptions: AdditionOption[];
  roleTemplates: RoleTemplate[];
  isCustomersLoading: boolean;
  isEmployeesLoading: boolean;
  isDepartmentsLoading: boolean;
  isAccountsLoading: boolean;
  isTransactionsLoading: boolean;
  isReportsLoading: boolean;
  isRoleTemplatesLoading: boolean;
  accountsError: string;
  roleTemplatesError: string;
  workflowDraft: ServiceWorkflowDraft | null;
  employeeAssignedDepartment: Counter | null | undefined;
  displayUserName: string;
  filteredTransactionRecords: Transaction[];
  filteredHistoryEvents: HistoryEvent[];
  filteredDepartments: DepartmentTableRow[];
  filteredBusinesses: Business[];
  customerDirectoryRecords: Array<Business | BusinessCustomer>;
  customerOutstandingRows: CustomerOutstandingRow[];
  customerPaymentTransactions: Transaction[];
  customerPageView: CustomerWorkspaceView;
  customerPageOptions: CustomerPageOption[];
  customerSectionTitle: string;
  customerSectionDescription: string;
  customerEntityLabel: string;
  customerEntityPlural: string;
  businessDirectoryFilters: DataTableFiltersValue;
  businessPermissionFilterLabel: string;
  hasActiveBusinessDirectoryFilters: boolean;
  isBusinessDirectoryLoading: boolean;
  businessDirectoryError: string;
  customerDirectoryPagination?: DataTablePagination;
  historyStatusFilter: 'All' | 'Failed';
  departmentSearchInput: string;
  departmentAccountStatusFilter: 'All' | 'Active' | 'Inactive' | 'Unassigned';
  isTransactionFiltersOpen: boolean;
  transactionFilters: DataTableFiltersValue;
  hasActiveTransactionFilters: boolean;
  serviceSummary: SummaryCardProps[];
  customerSummary: SummaryCardProps[];
  reminderSummary: SummaryCardProps[];
  employeeSummary: SummaryCardProps[];
  departmentSummary: SummaryCardProps[];
  accountSummary: SummaryCardProps[];
  transactionSummary: SummaryCardProps[];
  historySummary: SummaryCardProps[];
  reportSummary: SummaryCardProps[];
  expenseSummary: SummaryCardProps[];
  canEmployeeOperateOnDepartment: boolean;
  canAddCustomerRecords: boolean;
  canViewCustomerRecords: boolean;
  canEditCustomerRecords: boolean;
  canDeleteCustomerRecords: boolean;
  canAddEmployeeRecords: boolean;
  canViewEmployeeRecords: boolean;
  canEditEmployeeRecords: boolean;
  canDeleteEmployeeRecords: boolean;
  canAddDepartmentRecords: boolean;
  canEditDepartmentRecords: boolean;
  canDeleteDepartmentRecords: boolean;
  canAddAccountRecords: boolean;
  canEditAccountRecords: boolean;
  canDeleteAccountRecords: boolean;
  canAddServiceRecords: boolean;
  hasRequestedCustomerPageAccess: boolean;
  renderSummaryCards: (cards: SummaryCardProps[]) => ReactNode;
  renderTransactionFilters: () => ReactNode;
  renderBusinessPlanSection: (lockedMode?: boolean) => ReactNode;
  renderAdminDashboard: () => ReactNode;
  renderCustomerRoutePermissionState: () => ReactNode;
  canManageModule: (moduleId: string) => boolean;
  canDeleteModule: (moduleId: string) => boolean;
  canPerformModuleAction: (moduleId: string, action: 'add' | 'edit' | 'delete') => boolean;
  canAccessModuleForSession: (context: SessionAccessContext, moduleId: string) => boolean;
  getRoleLabel: (role: SessionUser['role']) => string;
  showNotification: (type: 'success' | 'warning' | 'error' | 'info', message: string) => void;
  reloadRoleTemplates: () => void;
  handleLogout: () => void;
  handleAdminProfileSave: (values: { name: string; email: string }) => void;
  handleBusinessProfileSave: (values: { name: string; phone: string; email: string; password?: string }) => void;
  handleEmployeeProfileSave: (values: { name: string; phone: string; email: string; password?: string }) => void;
  handleQuickAction: (action: string) => void;
  handleDismissNotification: (id: string) => void;
  handleViewTransaction: (transaction: Transaction) => void;
  handleDeleteRecord: (actionType: DashboardDeleteActionType, id: string) => void;
  handleEditService: (service: Service) => void;
  handleDeleteService: (id: string) => void;
  handleViewCustomerHistory: (recordId: string) => void;
  handleEditCustomer: (recordId: string) => void;
  handleViewHistory: (event: HistoryEvent) => void;
  handleEditEmployee: (employee: Employee) => void;
  handleDepartmentSearch: () => void;
  clearDepartmentFilters: () => void;
  handleEditDepartment: (counter: Counter) => void;
  handleEditAccount: (account: Account) => void;
  handleLinkAccount: (account: Account) => void;
  handleEditTransaction: (transaction: Transaction) => void;
  handleViewReport: (report: ReportItem) => void;
  handleEditExpense: (expense: Expense) => void;
  handleConfigureOption: (option: AdditionOption) => void;
  setIsTransactionFiltersOpen: Dispatch<SetStateAction<boolean>>;
  setDepartmentSearchInput: Dispatch<SetStateAction<string>>;
  setDepartmentAccountStatusFilter: Dispatch<SetStateAction<'All' | 'Active' | 'Inactive' | 'Unassigned'>>;
  setBusinessDirectoryFilters: Dispatch<SetStateAction<DataTableFiltersValue>>;
}
