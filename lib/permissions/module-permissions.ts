import { hasAnyPermission } from './checks';
import type { CustomerPermissions, SessionAccessContext } from './types';

const employeeModulePermissions = [
  'Employee_list',
  'Employee_add',
  'Employee_salary',
  'Employee_outstanding',
] as const;

export const modulePermissionMap = {
  dashboard: [],
  customers: [
    'Customers_list',
    'Customers_add',
    'Customers_payment_list',
    'Customers_outstanding',
  ],
  transactions: ['Services_access'],
  services: ['Services_access'],
  departments: ['Master_department_manage'],
  accounts: [
    'Master_account_manage',
    'accounts_cash_deposit',
    'Accounts_department_transfer',
  ],
  employee: employeeModulePermissions,
  employees: employeeModulePermissions,
  reports: [
    'Reports_bank_counter_report',
    'Reports_service_report',
    'Reports_day_report_service_charge_details',
    'reports_day_report_account_and_counter_details',
    'Reports_day_report_expense_details',
    'Reports_day_report_net_details',
    'Reports_day_report_grand_total',
    'Reports_day_report_log_report',
  ],
  expense: ['Expense_access'],
  reminder: [
    'Reminder_new_sms',
    'Reminder_set_reminder',
    'Reminder_scheduled_message',
  ],
  profile: [],
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
