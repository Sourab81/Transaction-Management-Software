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
  FaUserCircle,
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

export type PermissionFlag = 0 | 1;
export type CustomerPermissions = Record<string, PermissionFlag>;
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
    id: 'profile',
    label: 'Profile',
    sidebarLabel: 'Profile',
    heading: 'Profile',
    description: ' ',
    icon: FaUserCircle,
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

const withLegacyPermissionAliases = (canonicalId: string, extraAliases: string[] = []) => {
  const legacyDotId = canonicalId.replace('_', '.');
  return Array.from(new Set([canonicalId, legacyDotId, ...extraAliases]));
};

const customerPermissionIdAliases: Record<string, string[]> = {
  master_account_manage: withLegacyPermissionAliases('master_account_manage', ['masters.accounts', 'accounts.accounts_update']),
  master_department_manage: withLegacyPermissionAliases('master_department_manage', ['masters.counter', 'accounts.counters_update']),
  customers_add: withLegacyPermissionAliases('customers_add', ['customer.add_customer']),
  customers_list: withLegacyPermissionAliases('customers_list', ['customer.customer_list']),
  customers_payment_list: withLegacyPermissionAliases('customers_payment_list', ['customer.customer_payment_list']),
  customers_outstanding: withLegacyPermissionAliases('customers_outstanding', ['customer.customer_outstanding']),
  services_access: withLegacyPermissionAliases('services_access', ['service.add_service', 'service.service_list']),
  accounts_cash_deposit: withLegacyPermissionAliases('accounts_cash_deposit'),
  accounts_department_transfer: withLegacyPermissionAliases('accounts_department_transfer', ['accounts.counter_transfer']),
  reminder_new_sms: withLegacyPermissionAliases('reminder_new_sms'),
  reminder_set_reminder: withLegacyPermissionAliases('reminder_set_reminder'),
  reminder_scheduled_message: withLegacyPermissionAliases('reminder_scheduled_message'),
  reports_bank_counter_report: withLegacyPermissionAliases('reports_bank_counter_report'),
  reports_day_report_service_charge_details: withLegacyPermissionAliases('reports_day_report_service_charge_details'),
  reports_day_report_account_and_counter_details: withLegacyPermissionAliases('reports_day_report_account_and_counter_details'),
  reports_day_report_expense_details: withLegacyPermissionAliases('reports_day_report_expense_details'),
  reports_day_report_net_details: withLegacyPermissionAliases('reports_day_report_net_details'),
  reports_day_report_grand_total: withLegacyPermissionAliases('reports_day_report_grand_total'),
  reports_day_report_log_report: withLegacyPermissionAliases('reports_day_report_log_report'),
  reports_service_report: withLegacyPermissionAliases('reports_service_report'),
  employee_add: withLegacyPermissionAliases('employee_add', ['users.add_user']),
  employee_list: withLegacyPermissionAliases('employee_list', ['users.users_list']),
  employee_salary: withLegacyPermissionAliases('employee_salary', ['users.users_salary']),
  employee_outstanding: withLegacyPermissionAliases('employee_outstanding', ['users.user_outstanding']),
  expense_access: withLegacyPermissionAliases('expense_access', ['expense.user_other_expense']),
};

const customerPermissionIdByAlias = Object.entries(customerPermissionIdAliases).reduce<Record<string, string>>(
  (aliasesByPermissionId, [canonicalId, aliases]) => {
    aliases.forEach((alias) => {
      aliasesByPermissionId[alias] = canonicalId;
    });
    return aliasesByPermissionId;
  },
  {},
);

const resolveCanonicalPermissionId = (permissionId: string) =>
  customerPermissionIdByAlias[permissionId] ?? permissionId;

export const customerPermissionSections: CustomerPermissionSection[] = [
  {
    id: 'master',
    label: 'Master',
    items: [
      { id: 'master_account_manage', label: 'Account (Add, Edit)' },
      { id: 'master_department_manage', label: 'Department (Add, Edit)' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    items: [
      { id: 'customers_add', label: 'Add Customer' },
      { id: 'customers_list', label: 'Customers List' },
      { id: 'customers_payment_list', label: 'Customers Payment List' },
      { id: 'customers_outstanding', label: 'Customer Outstanding' },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    items: [
      { id: 'services_access', label: 'Services' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    items: [
      { id: 'accounts_cash_deposit', label: 'Cash Deposit' },
      { id: 'accounts_department_transfer', label: 'Department Transfer' },
    ],
  },
  {
    id: 'reminder',
    label: 'Reminder',
    items: [
      { id: 'reminder_new_sms', label: 'New SMS' },
      { id: 'reminder_set_reminder', label: 'Set Reminder' },
      { id: 'reminder_scheduled_message', label: 'Scheduled Message' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { id: 'reports_bank_counter_report', label: 'Bank Counter Report' },
      // { id: 'reports_day_report_heading', label: 'Day Report', kind: 'label' },
      { id: 'reports_day_report_service_charge_details', label: 'Service Charge Details', indent: 1 },
      { id: 'reports_day_report_account_and_counter_details', label: 'Account And Counter Details', indent: 1 },
      { id: 'reports_day_report_expense_details', label: 'Expense Details', indent: 1 },
      { id: 'reports_day_report_net_details', label: 'Net Details', indent: 1 },
      { id: 'reports_day_report_grand_total', label: 'Grand Total', indent: 1 },
      { id: 'reports_day_report_log_report', label: 'Log Report', indent: 1 },
      { id: 'reports_service_report', label: 'Service Report' },
    ],
  },
  {
    id: 'employee',
    label: 'Employee',
    items: [
      { id: 'employee_add', label: 'Add Employee' },
      { id: 'employee_list', label: 'Employee List' },
      { id: 'employee_salary', label: 'Employee Salary' },
      { id: 'employee_outstanding', label: 'Employee Outstanding' },
    ],
  },
  {
    id: 'expense',
    label: 'Expense',
    items: [
      { id: 'expense_access', label: 'Expense' },
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
  Object.fromEntries(customerPermissionToggleItems.map((item) => [item.id, 0])) as CustomerPermissions;

const toPermissionFlag = (value: unknown): PermissionFlag => {
  if (value === 1 || value === true) {
    return 1;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'active', 'enabled'].includes(normalizedValue)) {
      return 1;
    }
  }

  return 0;
};

export const normalizeCustomerPermissions = (permissions?: Record<string, unknown> | null): CustomerPermissions => {
  const nextPermissions = buildDefaultCustomerPermissions();
  if (!permissions) return nextPermissions;

  Object.entries(customerPermissionIdAliases).forEach(([canonicalId, aliases]) => {
    const resolvedValue = aliases.find((alias) => toPermissionFlag(permissions[alias]) === 1);

    if (resolvedValue) {
      nextPermissions[canonicalId] = 1;
    }
  });

  return nextPermissions;
};

export const createCustomerPermissions = (enabledPermissionIds: string[] = []): CustomerPermissions => {
  const rawPermissions = Object.fromEntries(enabledPermissionIds.map((permissionId) => [permissionId, 1])) as CustomerPermissions;
  const nextPermissions = normalizeCustomerPermissions(rawPermissions);

  enabledPermissionIds.forEach((permissionId) => {
    const canonicalPermissionId = resolveCanonicalPermissionId(permissionId);
    if (canonicalPermissionId in nextPermissions) {
      nextPermissions[canonicalPermissionId] = 1;
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
      normalizedBasePermissions[permissionId] === 1 && normalizedScopedPermissions[permissionId] === 1 ? 1 : 0,
    ]),
  ) as CustomerPermissions;
};

export const isPermissionEnabled = (
  permissions: CustomerPermissions | null | undefined,
  permissionId: string,
) => {
  const canonicalPermissionId = resolveCanonicalPermissionId(permissionId);
  const aliases = customerPermissionIdAliases[canonicalPermissionId] ?? [permissionId];

  return aliases.some((alias) => toPermissionFlag(permissions?.[alias]) === 1)
    || toPermissionFlag(permissions?.[canonicalPermissionId]) === 1;
};

export const hasAnyEnabledPermission = (
  permissions: CustomerPermissions | null | undefined,
  permissionIds: string[],
) => permissionIds.some((permissionId) => isPermissionEnabled(permissions, permissionId));

export const hasEnabledPermissionPrefix = (
  permissions: CustomerPermissions | null | undefined,
  prefix: string,
) => {
  const legacyPrefix = prefix.includes('_') ? prefix.replace('_', '.') : prefix;
  return Object.entries(permissions ?? {}).some(
    ([permissionId, enabled]) =>
      enabled === 1 && (permissionId.startsWith(prefix) || permissionId.startsWith(legacyPrefix)),
  );
};

export const canUseBusinessFeature = (
  permissions: CustomerPermissions | null | undefined,
  moduleId: string,
  action: BusinessFeatureAction,
) => {
  switch (moduleId) {
    case 'customers':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [
          'customers_add',
          'customers_list',
          'customers_payment_list',
          'customers_outstanding',
        ]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'customers_add');
      return isPermissionEnabled(permissions, 'customers_list');
    case 'employee':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [
          'employee_add',
          'employee_list',
          'employee_salary',
          'employee_outstanding',
        ]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'employee_add');
      return isPermissionEnabled(permissions, 'employee_list');
    case 'services':
      return isPermissionEnabled(permissions, 'services_access');
    case 'accounts':
      if (action === 'view') return true;
      return isPermissionEnabled(permissions, 'master_account_manage');
    case 'departments':
      if (action === 'view') return true;
      return isPermissionEnabled(permissions, 'master_department_manage');
    case 'reports':
      return hasEnabledPermissionPrefix(permissions, 'reports_');
    case 'expense':
      return isPermissionEnabled(permissions, 'expense_access');
    case 'transactions':
      return isPermissionEnabled(permissions, 'services_access');
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

const adminAccessibleModules = new Set(['dashboard', 'customers', 'reminder', 'history', 'reports', 'profile', 'additions']);
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

  if (moduleId === 'profile') {
    return true;
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
