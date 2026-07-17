const withLegacyPermissionAliases = (canonicalId: string, extraAliases: string[] = []) => {
  const legacyDotId = canonicalId.replace('_', '.');
  return Array.from(new Set([canonicalId, legacyDotId, ...extraAliases]));
};

export const customerPermissionIdAliases: Record<string, string[]> = {
  master_account: withLegacyPermissionAliases('master_account', ['master_account_manage', 'accounts.accounts_update']),
  master_color: withLegacyPermissionAliases('master_color'),
  master_counter: withLegacyPermissionAliases('master_counter', ['master_department_manage', 'accounts.counters_update', 'departments_manage', 'counter_manage']),
  master_customer_category: withLegacyPermissionAliases('master_customer_category'),
  master_expense_category: withLegacyPermissionAliases('master_expense_category'),
  master_inventory: withLegacyPermissionAliases('master_inventory', ['services_access', 'service.add_service', 'service.service_list']),
  master_panel_details: withLegacyPermissionAliases('master_panel_details'),
  master_reminder_event: withLegacyPermissionAliases('master_reminder_event'),
  customers_add: withLegacyPermissionAliases('customers_add', ['customer.add_customer']),
  customers_list: withLegacyPermissionAliases('customers_list', ['customer.customer_list']),
  customers_payment_list: withLegacyPermissionAliases('customers_payment_list', ['customer.customer_payment_list']),
  customers_outstanding: withLegacyPermissionAliases('customers_outstanding', ['customer.customer_outstanding']),
  transactions_add: withLegacyPermissionAliases('transactions_add'),
  transactions_list: withLegacyPermissionAliases('transactions_list', ['transaction_view', 'transaction_edit']),
  accounts_cash_deposit: withLegacyPermissionAliases('accounts_cash_deposit', ['cash_deposit']),
  accounts_balance_transfer: withLegacyPermissionAliases('accounts_balance_transfer', ['accounts_department_transfer', 'accounts.counter_transfer']),
  accounts_balance_update: withLegacyPermissionAliases('accounts_balance_update'),
  reminder_manage: withLegacyPermissionAliases('reminder_manage', ['reminder_new_sms', 'reminder_set_reminder', 'reminder_scheduled_message']),
  reports_bank_department: withLegacyPermissionAliases('reports_bank_department', ['reports_bank_counter_report']),
  reports_daily: withLegacyPermissionAliases('reports_daily', [
    'reports_day_report_service_charge_details',
    'reports_day_report_account_and_counter_details',
    'reports_day_report_expense_details',
    'reports_day_report_net_details',
    'reports_day_report_grand_total',
  ]),
  reports_log: withLegacyPermissionAliases('reports_log', ['reports_day_report_log_report', 'reports_service_report']),
  reports_transaction: withLegacyPermissionAliases('reports_transaction'),
  employees_add: withLegacyPermissionAliases('employees_add', ['employee_add', 'users.add_user']),
  employees_list: withLegacyPermissionAliases('employees_list', ['employee_list', 'users.users_list']),
  employees_salary: withLegacyPermissionAliases('employees_salary', ['employee_salary', 'users.users_salary']),
  expense_add: withLegacyPermissionAliases('expense_add', ['expense_access', 'expense.user_other_expense', 'expense_create']),
  expense_list: withLegacyPermissionAliases('expense_list', ['expense_access', 'expense.user_other_expense', 'expense_view']),
  permissions_manage: withLegacyPermissionAliases('permissions_manage'),
};

const customerPermissionIdByAlias = Object.entries(customerPermissionIdAliases).reduce<Record<string, string>>(
  (aliasesByPermissionId, [canonicalId, aliases]) => {
    aliases.forEach((alias) => {
      aliasesByPermissionId[alias] = canonicalId;
      aliasesByPermissionId[alias.toLowerCase()] = canonicalId;
    });
    return aliasesByPermissionId;
  },
  {},
);

export const resolveCanonicalPermissionId = (permissionId: string) =>
  customerPermissionIdByAlias[permissionId] ?? customerPermissionIdByAlias[permissionId.toLowerCase()] ?? permissionId;
