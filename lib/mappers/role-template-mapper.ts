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
  master_account: 'master_account',
  master_color: 'master_color',
  master_counter: 'master_counter',
  master_customer_category: 'master_customer_category',
  master_expense_category: 'master_expense_category',
  master_inventory: 'master_inventory',
  master_panel_details: 'master_panel_details',
  master_reminder_event: 'master_reminder_event',
  customers_add: 'customers_add',
  customers_list: 'customers_list',
  customers_payment_list: 'customers_payment_list',
  customers_outstanding: 'customers_outstanding',
  transactions_add: 'transactions_add',
  transactions_list: 'transactions_list',
  accounts_cash_deposit: 'accounts_cash_deposit',
  accounts_balance_transfer: 'accounts_balance_transfer',
  accounts_balance_update: 'accounts_balance_update',
  reminder_manage: 'reminder_manage',
  reports_bank_department: 'reports_bank_department',
  reports_daily: 'reports_daily',
  reports_log: 'reports_log',
  reports_transaction: 'reports_transaction',
  employees_add: 'employees_add',
  employees_list: 'employees_list',
  employees_salary: 'employees_salary',
  expense_add: 'expense_add',
  expense_list: 'expense_list',
  permissions_manage: 'permissions_manage',
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

export const isActiveRoleTemplate = (role: Pick<RoleTemplate, 'status'>) => {
  if (typeof role.status === 'undefined') {
    return true;
  }

  return ['1', 'true', 'yes', 'active', 'enabled'].includes(role.status.trim().toLowerCase());
};

export const isSelectableRoleTemplate = (role: Pick<RoleTemplate, 'id' | 'roleName' | 'status'>) =>
  isEditableRoleTemplate(role) && isActiveRoleTemplate(role);

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
    const backendKey = preferredBackendPrivilegeKeys[item.id]
      || findExistingBackendKey(backendPrivileges, item.id)
      || item.id;

    if (canonicalPermissionIds.has(item.id)) {
      const value = privileges[item.id];
      nextPrivileges[backendKey] = value && value >= 1 ? value : 0;
    }
  });

  return nextPrivileges;
};
