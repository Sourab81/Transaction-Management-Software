import {
  customerPermissionToggleItems,
  normalizeCustomerPermissions,
} from '../permissions';
import { isRecord } from './legacy-record';

const backendPermissionKeys: Record<string, string> = {
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

const flattenPermissionInput = (
  value: unknown,
  flattenedPermissions: Record<string, unknown> = {},
) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        flattenedPermissions[entry.trim()] = 1;
        return;
      }

      flattenPermissionInput(entry, flattenedPermissions);
    });

    return flattenedPermissions;
  }

  if (!isRecord(value)) {
    return flattenedPermissions;
  }

  Object.entries(value).forEach(([key, entryValue]) => {
    if (Array.isArray(entryValue) || isRecord(entryValue)) {
      flattenPermissionInput(entryValue, flattenedPermissions);
      return;
    }

    flattenedPermissions[key] = entryValue;
  });

  return flattenedPermissions;
};

export const buildEmployeePermissionsPayload = (
  permissions: unknown,
) => {
  const normalizedPermissions = normalizeCustomerPermissions(flattenPermissionInput(permissions));

  return customerPermissionToggleItems.reduce<Record<string, number>>((payload, permission) => {
    const value = normalizedPermissions[permission.id];
    if (value && value >= 1) {
      payload[backendPermissionKeys[permission.id] || permission.id] = value;
    }

    return payload;
  }, {});
};
