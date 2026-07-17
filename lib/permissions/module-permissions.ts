import { hasAnyPermission } from './checks';
import type { CustomerPermissions, SessionAccessContext } from './types';

const masterPermissionKeys = [
  'master_account',
  'master_color',
  'master_counter',
  'master_customer_category',
  'master_expense_category',
  'master_inventory',
  'master_panel_details',
  'master_reminder_event',
] as const;

export const modulePermissionMap = {
  dashboard: [],
  customers: [
    'customers_list',
    'customers_add',
    'customers_payment_list',
    'customers_outstanding',
  ],
  transactions: ['transactions_add', 'transactions_list'],
  services: ['master_inventory'],
  departments: ['master_counter'],
  accounts: [
    'master_account',
    'accounts_cash_deposit',
    'accounts_balance_transfer',
    'accounts_balance_update',
  ],
  colors: ['master_color'],
  'customer-categories': ['master_customer_category'],
  employee: ['employees_add', 'employees_list', 'employees_salary'],
  employees: ['employees_add', 'employees_list', 'employees_salary'],
  reports: [
    'reports_bank_department',
    'reports_daily',
    'reports_log',
    'reports_transaction',
  ],
  expense: ['expense_add', 'expense_list'],
  reminder: ['reminder_manage'],
  profile: [],
  permissions: ['permissions_manage'],
} as const;

export type PermissionMappedModuleId = keyof typeof modulePermissionMap;

export const safeBaseModules = new Set<string>(['dashboard', 'profile']);

export const getCanonicalPermissionModuleId = (moduleId: string) =>
  moduleId === 'employees' ? 'employee' : moduleId;

export const getModulePermissionKeys = (moduleId: string): readonly string[] | undefined => {
  const canonicalModuleId = getCanonicalPermissionModuleId(moduleId);

  return modulePermissionMap[canonicalModuleId as PermissionMappedModuleId];
};

export const moduleRequiresPermissions = (moduleId: string) => {
  const permissionKeys = getModulePermissionKeys(moduleId);
  return Boolean(permissionKeys && permissionKeys.length > 0);
};

export const hasAnyModulePermission = (
  permissions: CustomerPermissions | null | undefined,
  moduleId: string,
) => {
  const permissionKeys = getModulePermissionKeys(moduleId);
  return Boolean(permissionKeys && permissionKeys.length > 0 && hasAnyPermission(permissions, permissionKeys));
};

export const canViewModuleByPermissions = (
  context: Pick<SessionAccessContext, 'permissions'>,
  moduleId: string,
) => {
  const canonicalModuleId = getCanonicalPermissionModuleId(moduleId);
  const permissionKeys = getModulePermissionKeys(canonicalModuleId);

  if (!permissionKeys) {
    return false;
  }

  if (permissionKeys.length === 0) {
    return safeBaseModules.has(canonicalModuleId);
  }

  return hasAnyPermission(context.permissions, permissionKeys);
};
