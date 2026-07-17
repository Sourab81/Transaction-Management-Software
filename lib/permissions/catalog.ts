import type { CustomerPermissionOption, CustomerPermissionSection } from './types';

export const customerPermissionSections: CustomerPermissionSection[] = [
  {
    id: 'master',
    label: 'Master',
    items: [
      { id: 'master_account', label: 'Account' },
      { id: 'master_color', label: 'Color' },
      { id: 'master_counter', label: 'Counter' },
      { id: 'master_customer_category', label: 'Customer Category' },
      { id: 'master_expense_category', label: 'Expense Category' },
      { id: 'master_inventory', label: 'Inventory' },
      { id: 'master_panel_details', label: 'Panel Details' },
      { id: 'master_reminder_event', label: 'Reminder Event' },
    ],
  },
  {
    id: 'customer_management',
    label: 'Customer',
    items: [
      { id: 'customers_add', label: 'Add Customer' },
      { id: 'customers_list', label: 'Customer List' },
      { id: 'customers_payment_list', label: 'Customer Payment List' },
      { id: 'customers_outstanding', label: 'Customer Outstanding' },
    ],
  },
  {
    id: 'transaction_operations',
    label: 'Transaction',
    items: [
      { id: 'transactions_add', label: 'Add Transaction' },
      { id: 'transactions_list', label: 'Transaction List' },
    ],
  },
  {
    id: 'account_operations',
    label: 'Accounts',
    items: [
      { id: 'accounts_cash_deposit', label: 'Cash Deposit' },
      { id: 'accounts_balance_transfer', label: 'Balance Transfer' },
      { id: 'accounts_balance_update', label: 'Balance Update' },
    ],
  },
  {
    id: 'reminder_management',
    label: 'Reminder',
    items: [
      { id: 'reminder_manage', label: 'Manage Reminders' },
    ],
  },
  {
    id: 'reporting_analytics',
    label: 'Reports',
    items: [
      { id: 'reports_bank_department', label: 'Bank/Department Report' },
      { id: 'reports_daily', label: 'Daily Report' },
      { id: 'reports_log', label: 'Log Report' },
      { id: 'reports_transaction', label: 'Transaction Report' },
    ],
  },
  {
    id: 'employee_management',
    label: 'Employees',
    items: [
      { id: 'employees_add', label: 'Add Employee' },
      { id: 'employees_list', label: 'Employee List' },
      { id: 'employees_salary', label: 'Employee Salary' },
    ],
  },
  {
    id: 'expense_management',
    label: 'Expense',
    items: [
      { id: 'expense_add', label: 'Add Expense' },
      { id: 'expense_list', label: 'Expense List' },
    ],
  },
  {
    id: 'tools',
    label: 'Tool',
    items: [
      { id: 'permissions_manage', label: 'Permissions' },
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
