import type { CustomerWorkspaceView } from './workspace-routes';

export type ModuleUiId =
  | 'dashboard'
  | 'customers'
  | 'transactions'
  | 'services'
  | 'accounts'
  | 'employee'
  | 'departments'
  | 'expense'
  | 'history'
  | 'reports'
  | 'role'
  | 'profile'
  | 'additions';

export interface ModuleUiConfig {
  id: ModuleUiId;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  permissionTitle: string;
  permissionDescription: string;
}

export interface CustomerWorkspaceViewUiConfig {
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  permissionTitle: string;
  permissionDescription: string;
}

export const moduleUi: Record<ModuleUiId, ModuleUiConfig> = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    emptyTitle: 'No dashboard activity yet',
    emptyDescription: 'Your workspace summary, notifications, and recent activity will appear here as records are added.',
    permissionTitle: 'Dashboard access is restricted',
    permissionDescription: 'Your signed-in role cannot open the dashboard right now.',
  },
  customers: {
    id: 'customers',
    label: 'Customers',
    emptyTitle: 'No customer records yet',
    emptyDescription: 'Add customer details once to reuse them across transactions, payments, and outstanding balances.',
    permissionTitle: 'Customer access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open customer records.',
  },
  transactions: {
    id: 'transactions',
    label: 'Transactions',
    emptyTitle: 'No transaction records yet',
    emptyDescription: 'Saved service transactions will appear here with status, payments, and department details.',
    permissionTitle: 'Transaction access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open transaction activity.',
  },
  services: {
    id: 'services',
    label: 'Services',
    emptyTitle: 'No services available yet',
    emptyDescription: 'Add a service to make it available in the transaction workflow.',
    permissionTitle: 'Service access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open the service catalog.',
  },
  accounts: {
    id: 'accounts',
    label: 'Accounts',
    emptyTitle: 'No accounts available yet',
    emptyDescription: 'Add a payment account to connect departments and track balances.',
    permissionTitle: 'Account access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open payment accounts.',
  },
  employee: {
    id: 'employee',
    label: 'Employees',
    emptyTitle: 'No employees added yet',
    emptyDescription: 'Add team members to assign permissions and departments.',
    permissionTitle: 'Employee access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open the employee directory.',
  },
  departments: {
    id: 'departments',
    label: 'Departments',
    emptyTitle: 'No departments added yet',
    emptyDescription: 'Add a department to route services, counters, and account activity.',
    permissionTitle: 'Department access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open department records.',
  },
  expense: {
    id: 'expense',
    label: 'Expenses',
    emptyTitle: 'No expense entries yet',
    emptyDescription: 'Expense records will appear here after they are added to the ledger.',
    permissionTitle: 'Expense access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open expense records.',
  },
  history: {
    id: 'history',
    label: 'History',
    emptyTitle: 'No history records yet',
    emptyDescription: 'Completed and failed business events will appear here for review.',
    permissionTitle: 'History access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open activity history.',
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    emptyTitle: 'No reports generated yet',
    emptyDescription: 'Generate a report to review exports, summaries, and audit snapshots.',
    permissionTitle: 'Report access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open reports.',
  },
  role: {
    id: 'role',
    label: 'Role',
    emptyTitle: 'No role templates yet',
    emptyDescription: 'Create predefined roles to apply reusable permission sets during user creation.',
    permissionTitle: 'Role access is restricted',
    permissionDescription: 'Your signed-in role cannot manage predefined roles.',
  },
  profile: {
    id: 'profile',
    label: 'Profile',
    emptyTitle: 'Profile details are unavailable',
    emptyDescription: 'Your personal account details will appear here once the workspace finishes loading your session.',
    permissionTitle: 'Profile access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open profile settings.',
  },
  additions: {
    id: 'additions',
    label: 'Settings',
    emptyTitle: 'No settings available yet',
    emptyDescription: 'Configuration options will appear here when system controls are available.',
    permissionTitle: 'Settings access is restricted',
    permissionDescription: 'Your current permissions do not allow you to open system settings.',
  },
};

export const customerWorkspaceViewUi: Record<CustomerWorkspaceView, CustomerWorkspaceViewUiConfig> = {
  list: {
    label: 'Customer List',
    emptyTitle: 'No customer records yet',
    emptyDescription: 'Add customer details once to reuse them across transactions and collections.',
    permissionTitle: 'Customer list is unavailable',
    permissionDescription: 'This customer route is not available with your current permissions.',
  },
  payments: {
    label: 'Customer Payment List',
    emptyTitle: 'No customer payment records yet',
    emptyDescription: 'Completed and pending customer payments will appear here once transactions are saved.',
    permissionTitle: 'Customer payment list is unavailable',
    permissionDescription: 'This customer payment route is not available with your current permissions.',
  },
  outstanding: {
    label: 'Customer Outstanding',
    emptyTitle: 'No outstanding balances right now',
    emptyDescription: 'Customers with pending amounts will appear here when balances remain unpaid.',
    permissionTitle: 'Customer outstanding view is unavailable',
    permissionDescription: 'This outstanding route is not available with your current permissions.',
  },
};

export const getModuleUi = (moduleId: string) => moduleUi[moduleId as ModuleUiId] ?? null;

export const getModuleLabel = (moduleId: string) => getModuleUi(moduleId)?.label;

export const getCustomerWorkspaceViewUi = (view: CustomerWorkspaceView) => customerWorkspaceViewUi[view];
