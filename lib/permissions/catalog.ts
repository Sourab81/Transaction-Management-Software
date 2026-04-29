import type { CustomerPermissionOption, CustomerPermissionSection } from './types';

export const customerPermissionSections: CustomerPermissionSection[] = [
  {
    id: 'business_setup',
    label: 'Business Setup',
    items: [
      { id: 'master_account_manage', label: 'Manage Accounts (Add, Edit, Delete)' },
      { id: 'master_department_manage', label: 'Manage Departments (Add, Edit, Delete)' },
    ],
  },
  {
    id: 'customer_management',
    label: 'Customer Management',
    items: [
      { id: 'customers_add', label: 'Add New Customers' },
      { id: 'customers_list', label: 'View Customer Directory' },
      { id: 'customers_payment_list', label: 'View Customer Payment History' },
      { id: 'customers_outstanding', label: 'View Customer Outstanding Balances' },
    ],
  },
  {
    id: 'service_operations',
    label: 'Service Operations',
    items: [
      { id: 'services_access', label: 'Manage Services (View, Add, Edit)' },
    ],
  },
  {
    id: 'financial_operations',
    label: 'Financial Operations',
    items: [
      { id: 'accounts_cash_deposit', label: 'Process Cash Deposits' },
      { id: 'accounts_department_transfer', label: 'Department Fund Transfers' },
    ],
  },
  {
    id: 'employee_management',
    label: 'Employee Management',
    items: [
      { id: 'employee_add', label: 'Add New Employees' },
      { id: 'employee_list', label: 'View Employee Directory' },
      { id: 'employee_salary', label: 'Manage Employee Salaries' },
      { id: 'employee_outstanding', label: 'View Employee Outstanding Balances' },
    ],
  },
  {
    id: 'expense_management',
    label: 'Expense Management',
    items: [
      { id: 'expense_access', label: 'Manage Business Expenses' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication & Reminders',
    items: [
      { id: 'reminder_new_sms', label: 'Send SMS Notifications' },
      { id: 'reminder_set_reminder', label: 'Create Payment Reminders' },
      { id: 'reminder_scheduled_message', label: 'Schedule Automated Messages' },
    ],
  },
  {
    id: 'reporting_analytics',
    label: 'Reports & Analytics',
    items: [
      { id: 'reports_bank_counter_report', label: 'Bank & Counter Reports' },
      { id: 'reports_service_report', label: 'Service Performance Reports' },
      { id: 'day_reports_heading', label: 'Daily Business Reports', kind: 'label' },
      { id: 'reports_day_report_service_charge_details', label: 'Service Charge Breakdown', indent: 1 },
      { id: 'reports_day_report_account_and_counter_details', label: 'Account & Counter Summary', indent: 1 },
      { id: 'reports_day_report_expense_details', label: 'Daily Expense Details', indent: 1 },
      { id: 'reports_day_report_net_details', label: 'Net Revenue Analysis', indent: 1 },
      { id: 'reports_day_report_grand_total', label: 'Daily Grand Total', indent: 1 },
      { id: 'reports_day_report_log_report', label: 'Activity Log Report', indent: 1 },
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
