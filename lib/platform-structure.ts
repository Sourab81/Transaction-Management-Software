import type { IconType } from 'react-icons';
import {
  FaBell,
  FaBuilding,
  FaChartBar,
  FaCog,
  FaDollarSign,
  FaExchangeAlt,
  FaHistory,
  FaPlusSquare,
  FaTachometerAlt,
  FaUniversity,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';

export type UserRole = 'Admin' | 'Employee' | 'Customer';

export const roleLabels: Record<UserRole, string> = {
  Admin: 'Admin',
  Employee: 'Employee',
  Customer: 'Business',
};

export const getRoleLabel = (role: UserRole) => roleLabels[role];

export const getModuleDisplay = (platformModule: PlatformModule, role: UserRole) => {
  if (role === 'Admin' && platformModule.id === 'customers') {
    return {
      ...platformModule,
      label: 'Business',
      sidebarLabel: 'Business',
      heading: 'Business',
    };
  }

  return platformModule;
};

export interface PlatformModule {
  id: string;
  label: string;
  sidebarLabel: string;
  heading: string;
  description: string;
  icon: IconType;
  allowedRoles: UserRole[];
  sidebarRoles?: UserRole[];
}

export interface CustomerPermissionItem {
  id: string;
  label: string;
  indent?: number;
  kind?: 'toggle' | 'label';
}

export interface CustomerPermissionSection {
  id: string;
  label: string;
  items: CustomerPermissionItem[];
}

export interface CustomerPermissionOption {
  id: string;
  label: string;
  sectionId: string;
  sectionLabel: string;
}

export type CustomerPermissions = Record<string, boolean>;
export type BusinessFeatureAction = 'view' | 'add' | 'edit' | 'delete';

export interface SessionAccessContext {
  role: UserRole;
  permissions?: CustomerPermissions | null;
  businessId?: string;
}

export const userDashboardModules: PlatformModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    sidebarLabel: 'Dashboard',
    heading: 'Dashboard',
    description: ' ',
    icon: FaTachometerAlt,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Admin', 'Employee', 'Customer'],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    sidebarLabel: 'Transactions',
    heading: 'Transactions',
    description: ' ',
    icon: FaExchangeAlt,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Employee', 'Customer'],
  },
  {
    id: 'customers',
    label: 'Customer',
    sidebarLabel: 'Customers',

    heading: 'Customer',
    description: ' ',
    icon: FaUsers,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Admin', 'Employee', 'Customer'],
  },
  {
    id: 'reminder',
    label: 'Reminder',
    sidebarLabel: 'Reminder',
    heading: 'Reminder',
    description: ' ',
    icon: FaBell,
    allowedRoles: ['Admin', 'Employee'],
    sidebarRoles: ['Admin', 'Employee'],
  },
  {
    id: 'employee',
    label: 'Employee',
    sidebarLabel: 'Employee',
    heading: 'Employee',
    description: ' ',
    icon: FaUserTie,
    allowedRoles: ['Customer'],
    sidebarRoles: ['Customer'],
  },
  {
    id: 'departments',
    label: 'Department',
    sidebarLabel: 'Department',
    heading: 'Department',
    description: ' ',
    icon: FaBuilding,
    allowedRoles: ['Customer'],
    sidebarRoles: ['Customer'],
  },
  {
    id: 'services',
    label: 'Service',
    sidebarLabel: 'Services',
    heading: 'Service',
    description: ' ',
    icon: FaCog,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Employee', 'Customer'],
  },
  {
    id: 'accounts',
    label: 'Account',
    sidebarLabel: 'Account',
    heading: 'Account',
    description: ' ',
    icon: FaUniversity,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Employee', 'Customer'],
  },
  {
    id: 'reports',
    label: 'Reports',
    sidebarLabel: 'Reports',
    heading: 'Reports',
    description: ' ',
    icon: FaChartBar,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Admin', 'Employee', 'Customer'],
  },
  {
    id: 'expense',
    label: 'Expense',
    sidebarLabel: 'Expense',
    heading: 'Expense',
    description: ' ',
    icon: FaDollarSign,
    allowedRoles: ['Customer'],
    sidebarRoles: ['Customer'],
  },
  {
    id: 'history',
    label: 'Activity Timeline',
    sidebarLabel: 'History',
    heading: 'Activity Timeline',
    description: ' ',
    icon: FaHistory,
    allowedRoles: ['Admin', 'Employee'],
    sidebarRoles: [],
  },
  {
    id: 'additions',
    label: 'System Settings',
    sidebarLabel: 'Settings',
    heading: 'System Settings',
    description: ' ',
    icon: FaPlusSquare,
    allowedRoles: ['Admin'],
    sidebarRoles: [],
  },
];

export const adminDashboardModules = [
  'Dashboard',
  'Customers',
  'Reminder',
  'Reports',
];

const customerPermissionIdAliases: Record<string, string[]> = {
  'master.account_manage': ['master.account_manage', 'masters.accounts', 'accounts.accounts_update'],
  'master.department_manage': ['master.department_manage', 'masters.counter', 'accounts.counters_update'],
  'customers.add': ['customers.add', 'customer.add_customer'],
  'customers.list': ['customers.list', 'customer.customer_list'],
  'customers.payment_list': ['customers.payment_list', 'customer.customer_payment_list'],
  'customers.outstanding': ['customers.outstanding', 'customer.customer_outstanding'],
  'services.access': ['services.access', 'service.add_service', 'service.service_list'],
  'accounts.cash_deposit': ['accounts.cash_deposit'],
  'accounts.department_transfer': ['accounts.department_transfer', 'accounts.counter_transfer'],
  'reminder.new_sms': ['reminder.new_sms'],
  'reminder.set_reminder': ['reminder.set_reminder'],
  'reminder.scheduled_message': ['reminder.scheduled_message'],
  'reports.bank_counter_report': ['reports.bank_counter_report'],
  'reports.day_report_service_charge_details': ['reports.day_report_service_charge_details'],
  'reports.day_report_account_and_counter_details': ['reports.day_report_account_and_counter_details'],
  'reports.day_report_expense_details': ['reports.day_report_expense_details'],
  'reports.day_report_net_details': ['reports.day_report_net_details'],
  'reports.day_report_grand_total': ['reports.day_report_grand_total'],
  'reports.day_report_log_report': ['reports.day_report_log_report'],
  'reports.service_report': ['reports.service_report'],
  'employee.add': ['employee.add', 'users.add_user'],
  'employee.list': ['employee.list', 'users.users_list'],
  'employee.salary': ['employee.salary', 'users.users_salary'],
  'employee.outstanding': ['employee.outstanding', 'users.user_outstanding'],
  'expense.access': ['expense.access', 'expense.user_other_expense'],
};

export const customerPermissionSections: CustomerPermissionSection[] = [
  {
    id: 'master',
    label: 'Master',
    items: [
      { id: 'master.account_manage', label: 'Account (Add, Edit)' },
      { id: 'master.department_manage', label: 'Department (Add, Edit)' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    items: [
      { id: 'customers.add', label: 'Add Customer' },
      { id: 'customers.list', label: 'Customers List' },
      { id: 'customers.payment_list', label: 'Customers Payment List' },
      { id: 'customers.outstanding', label: 'Customer Outstanding' },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    items: [
      { id: 'services.access', label: 'Services' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    items: [
      { id: 'accounts.cash_deposit', label: 'Cash Deposit' },
      { id: 'accounts.department_transfer', label: 'Department Transfer' },
    ],
  },
  {
    id: 'reminder',
    label: 'Reminder',
    items: [
      { id: 'reminder.new_sms', label: 'New SMS' },
      { id: 'reminder.set_reminder', label: 'Set Reminder' },
      { id: 'reminder.scheduled_message', label: 'Scheduled Message' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { id: 'reports.bank_counter_report', label: 'Bank Counter Report' },
      { id: 'reports.day_report_heading', label: 'Day Report', kind: 'label' },
      { id: 'reports.day_report_service_charge_details', label: 'Service Charge Details', indent: 1 },
      { id: 'reports.day_report_account_and_counter_details', label: 'Account And Counter Details', indent: 1 },
      { id: 'reports.day_report_expense_details', label: 'Expense Details', indent: 1 },
      { id: 'reports.day_report_net_details', label: 'Net Details', indent: 1 },
      { id: 'reports.day_report_grand_total', label: 'Grand Total', indent: 1 },
      { id: 'reports.day_report_log_report', label: 'Log Report', indent: 1 },
      { id: 'reports.service_report', label: 'Service Report' },
    ],
  },
  {
    id: 'employee',
    label: 'Employee',
    items: [
      { id: 'employee.add', label: 'Add Employee' },
      { id: 'employee.list', label: 'Employee List' },
      { id: 'employee.salary', label: 'Employee Salary' },
      { id: 'employee.outstanding', label: 'Employee Outstanding' },
    ],
  },
  {
    id: 'expense',
    label: 'Expense',
    items: [
      { id: 'expense.access', label: 'Expense' },
    ],
  },
];

export const customerPermissionToggleItems = customerPermissionSections.flatMap((section) =>
  section.items.filter((item) => item.kind !== 'label')
);

export const customerPermissionOptions: CustomerPermissionOption[] = customerPermissionSections.flatMap((section) =>
  section.items
    .filter((item) => item.kind !== 'label')
    .map((item) => ({
      id: item.id,
      label: `${section.label}: ${item.label}`,
      sectionId: section.id,
      sectionLabel: section.label,
    }))
);

export const buildDefaultCustomerPermissions = (): CustomerPermissions =>
  Object.fromEntries(customerPermissionToggleItems.map((item) => [item.id, false]));

export const normalizeCustomerPermissions = (permissions?: Partial<CustomerPermissions> | null): CustomerPermissions => {
  const nextPermissions = buildDefaultCustomerPermissions();
  if (!permissions) return nextPermissions;

  Object.entries(customerPermissionIdAliases).forEach(([canonicalId, aliases]) => {
    if (aliases.some((alias) => permissions[alias])) {
      nextPermissions[canonicalId] = true;
    }
  });

  return nextPermissions;
};

export const createCustomerPermissions = (enabledPermissionIds: string[] = []): CustomerPermissions => {
  const rawPermissions = Object.fromEntries(enabledPermissionIds.map((permissionId) => [permissionId, true])) as CustomerPermissions;
  const nextPermissions = normalizeCustomerPermissions(rawPermissions);

  enabledPermissionIds.forEach((permissionId) => {
    if (permissionId in nextPermissions) {
      nextPermissions[permissionId] = true;
    }
  });

  return nextPermissions;
};

export const intersectCustomerPermissions = (
  basePermissions: CustomerPermissions | null | undefined,
  scopedPermissions: CustomerPermissions | null | undefined,
): CustomerPermissions => {
  const normalizedBasePermissions = normalizeCustomerPermissions(basePermissions);
  const normalizedScopedPermissions = normalizeCustomerPermissions(scopedPermissions);

  return Object.fromEntries(
    Object.keys(normalizedBasePermissions).map((permissionId) => [
      permissionId,
      normalizedBasePermissions[permissionId] && normalizedScopedPermissions[permissionId],
    ]),
  ) as CustomerPermissions;
};

export const isPermissionEnabled = (
  permissions: CustomerPermissions | null | undefined,
  permissionId: string,
) => Boolean(permissions?.[permissionId]);

export const hasAnyEnabledPermission = (
  permissions: CustomerPermissions | null | undefined,
  permissionIds: string[],
) => permissionIds.some((permissionId) => isPermissionEnabled(permissions, permissionId));

export const hasEnabledPermissionPrefix = (
  permissions: CustomerPermissions | null | undefined,
  prefix: string,
) => Object.entries(permissions ?? {}).some(([permissionId, enabled]) => enabled && permissionId.startsWith(prefix));

export const canUseBusinessFeature = (
  permissions: CustomerPermissions | null | undefined,
  moduleId: string,
  action: BusinessFeatureAction,
) => {
  switch (moduleId) {
    case 'customers':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [
          'customers.add',
          'customers.list',
          'customers.payment_list',
          'customers.outstanding',
        ]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'customers.add');
      return isPermissionEnabled(permissions, 'customers.list');
    case 'employee':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [
          'employee.add',
          'employee.list',
          'employee.salary',
          'employee.outstanding',
        ]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'employee.add');
      return isPermissionEnabled(permissions, 'employee.list');
    case 'services':
      return isPermissionEnabled(permissions, 'services.access');
    case 'accounts':
      if (action === 'view') return true;
      return isPermissionEnabled(permissions, 'master.account_manage');
    case 'departments':
      if (action === 'view') return true;
      return isPermissionEnabled(permissions, 'master.department_manage');
    case 'reports':
      return hasEnabledPermissionPrefix(permissions, 'reports.');
    case 'expense':
      return isPermissionEnabled(permissions, 'expense.access');
    case 'transactions':
      return isPermissionEnabled(permissions, 'services.access');
    default:
      return false;
  }
};

export const workflowSteps = [
  'Login',
  'Service Selection',
  'Customer Entry Or Autofill',
  'Transaction Processing',
  'Save Record',
  'Report Generation',
];

export const pageHeadings = userDashboardModules.reduce<Record<string, string>>((headings, module) => {
  headings[module.id] = module.heading;
  return headings;
}, {});

export const getSidebarModules = (role: UserRole) => {
  return userDashboardModules.filter((module) => (module.sidebarRoles ?? module.allowedRoles).includes(role));
};

export const getAllowedModules = (role: UserRole) => {
  return userDashboardModules.filter((module) => module.allowedRoles.includes(role));
};

export const getModuleById = (moduleId: string) => {
  return userDashboardModules.find((platformModule) => platformModule.id === moduleId);
};

export const getModuleDisplayById = (moduleId: string, role: UserRole) => {
  const platformModule = getModuleById(moduleId);
  return platformModule ? getModuleDisplay(platformModule, role) : undefined;
};

export const canAccessModule = (role: UserRole, moduleId: string) => {
  const platformModule = getModuleById(moduleId);
  return Boolean(platformModule?.allowedRoles.includes(role));
};

const adminAccessibleModules = new Set(['dashboard', 'customers', 'reminder', 'history', 'reports', 'additions']);
const permissionBackedModules = new Set(['customers', 'employee', 'services', 'accounts', 'departments', 'reports', 'expense', 'transactions']);

const businessHasModulePermission = (permissions: CustomerPermissions | null | undefined, moduleId: string) => {
  switch (moduleId) {
    case 'customers':
      return canUseBusinessFeature(permissions, 'customers', 'view');
    case 'employee':
      return canUseBusinessFeature(permissions, 'employee', 'view');
    case 'services':
      return canUseBusinessFeature(permissions, 'services', 'view');
    case 'accounts':
      return canUseBusinessFeature(permissions, 'accounts', 'view');
    case 'departments':
      return canUseBusinessFeature(permissions, 'departments', 'view');
    case 'reports':
      return canUseBusinessFeature(permissions, 'reports', 'view');
    case 'expense':
      return canUseBusinessFeature(permissions, 'expense', 'view');
    case 'transactions':
      return canUseBusinessFeature(permissions, 'transactions', 'view');
    default:
      return false;
  }
};

export const getBusinessEnabledModules = (permissions: CustomerPermissions | null | undefined) => {
  const enabledModules = new Set<string>(['dashboard']);

  permissionBackedModules.forEach((moduleId) => {
    if (businessHasModulePermission(permissions, moduleId)) {
      enabledModules.add(moduleId);
    }
  });

  return enabledModules;
};

export const canAccessModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  if (context.role === 'Admin') {
    return adminAccessibleModules.has(moduleId);
  }

  if (!canAccessModule(context.role, moduleId)) {
    return false;
  }

  if (!context.businessId) {
    return false;
  }

  if (context.role === 'Customer') {
    return getBusinessEnabledModules(context.permissions).has(moduleId);
  }

  if (permissionBackedModules.has(moduleId)) {
    return getBusinessEnabledModules(context.permissions).has(moduleId);
  }

  return true;
};

export const getSidebarModulesForSession = (context: SessionAccessContext) => {
  return userDashboardModules.filter((module) => {
    const visibleToRole = (module.sidebarRoles ?? module.allowedRoles).includes(context.role);
    return visibleToRole && canAccessModuleForSession(context, module.id);
  });
};
