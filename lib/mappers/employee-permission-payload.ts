import {
  customerPermissionToggleItems,
  normalizeCustomerPermissions,
} from '../permissions';
import { isRecord } from './legacy-record';

const backendPermissionKeys: Record<string, string> = {
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

  return customerPermissionToggleItems.reduce<Record<string, 1>>((payload, permission) => {
    if (normalizedPermissions[permission.id] === 1) {
      payload[backendPermissionKeys[permission.id] || permission.id] = 1;
    }

    return payload;
  }, {});
};
