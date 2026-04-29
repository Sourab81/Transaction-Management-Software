import {
  customerPermissionToggleItems,
  normalizeCustomerPermissions,
  type CustomerPermissions,
} from '../permissions';
import type { RoleTemplate } from '../types/role-template';
import {
  extractCollectionItems,
  isRecord,
  readStringValue,
  readUnknownValue,
  type UnknownRecord,
} from './legacy-record';

const preferredBackendPrivilegeKeys: Record<string, string> = {
  master_account_manage: 'Master_account_manage',
  master_department_manage: 'Master_department_manage',
  customers_add: 'Customers_add',
  customers_list: 'Customers_list',
  customers_payment_list: 'Customers_payment_list',
  customers_outstanding: 'Customers_outstanding',
  services_access: 'Services_access',
  accounts_cash_deposit: 'accounts_cash_deposit',
  accounts_department_transfer: 'Accounts_department_transfer',
  reminder_new_sms: 'Reminder_new_sms',
  reminder_set_reminder: 'Reminder_set_reminder',
  reminder_scheduled_message: 'Reminder_scheduled_message',
  reports_bank_counter_report: 'Reports_bank_counter_report',
  reports_day_report_service_charge_details: 'Reports_day_report_service_charge_details',
  reports_day_report_account_and_counter_details: 'reports_day_report_account_and_counter_details',
  reports_day_report_expense_details: 'Reports_day_report_expense_details',
  reports_day_report_net_details: 'Reports_day_report_net_details',
  reports_day_report_grand_total: 'Reports_day_report_grand_total',
  reports_day_report_log_report: 'Reports_day_report_log_report',
  reports_service_report: 'Reports_service_report',
  employee_add: 'Employee_add',
  employee_list: 'Employee_list',
  employee_salary: 'Employee_salary',
  employee_outstanding: 'Employee_outstanding',
  expense_access: 'Expense_access',
};

const canonicalPermissionIds = new Set(customerPermissionToggleItems.map((item) => item.id));

const parsePrivilegeValue = (value: unknown): Record<string, unknown> => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsedValue = JSON.parse(value) as unknown;
      return isRecord(parsedValue) ? parsedValue : {};
    } catch {
      return {};
    }
  }

  return {};
};

const readRolePrivileges = (record: UnknownRecord) =>
  parsePrivilegeValue(
    readUnknownValue(record, [
      'privileges',
      'privilege',
      'permission',
      'permissions',
      'role_privileges',
      'rolePrivileges',
    ]),
  );

export const mapRoleTemplateRecord = (record: UnknownRecord): RoleTemplate | null => {
  const id = readStringValue(record, ['id', 'role_id', 'roleId']);
  const roleName = readStringValue(record, ['role_name', 'roleName', 'name', 'title']);

  if (!id || !roleName) {
    return null;
  }

  const backendPrivileges = readRolePrivileges(record);

  return {
    id,
    roleName,
    privileges: normalizeCustomerPermissions(backendPrivileges),
    backendPrivileges,
    createdDate: readStringValue(record, ['created_at', 'createdAt', 'create_date', 'created_date', 'createdDate']) || undefined,
    updatedDate: readStringValue(record, ['updated_at', 'updatedAt', 'update_date', 'updated_date', 'updatedDate']) || undefined,
    status: readStringValue(record, ['status', 'is_active']) || undefined,
    raw: record,
  };
};

export const mapRoleTemplatesResponse = (payload: unknown): RoleTemplate[] =>
  extractCollectionItems(payload, ['data', 'roles', 'items', 'rows', 'records']).reduce<RoleTemplate[]>((roles, entry) => {
    if (!isRecord(entry)) {
      return roles;
    }

    const mappedRole = mapRoleTemplateRecord(entry);
    if (mappedRole) {
      roles.push(mappedRole);
    }

    return roles;
  }, []);

export const isEditableRoleTemplate = (role: Pick<RoleTemplate, 'id' | 'roleName'>) =>
  role.id !== '1' && role.roleName.trim().toLowerCase() !== 'super admin';

const findExistingBackendKey = (backendPrivileges: Record<string, unknown>, canonicalPermissionId: string) => {
  const lowerCanonicalId = canonicalPermissionId.toLowerCase();

  return Object.keys(backendPrivileges).find((key) => key.toLowerCase() === lowerCanonicalId);
};

export const buildRoleTemplatePrivilegesPayload = (
  privileges: CustomerPermissions,
  backendPrivileges: Record<string, unknown> = {},
) => {
  const knownBackendKeys = new Set(
    Object.keys(preferredBackendPrivilegeKeys).map((key) => key.toLowerCase()),
  );
  const preservedUnknownPrivileges = Object.fromEntries(
    Object.entries(backendPrivileges).filter(([key]) => !knownBackendKeys.has(key.toLowerCase())),
  );
  const nextPrivileges = { ...preservedUnknownPrivileges };

  customerPermissionToggleItems.forEach((item) => {
    const backendKey = findExistingBackendKey(backendPrivileges, item.id)
      || preferredBackendPrivilegeKeys[item.id]
      || item.id;

    if (canonicalPermissionIds.has(item.id)) {
      nextPrivileges[backendKey] = privileges[item.id] === 1 ? 1 : 0;
    }
  });

  return nextPrivileges;
};
