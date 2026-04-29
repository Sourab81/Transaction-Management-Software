const withLegacyPermissionAliases = (canonicalId: string, extraAliases: string[] = []) => {
  const legacyDotId = canonicalId.replace('_', '.');
  return Array.from(new Set([canonicalId, legacyDotId, ...extraAliases]));
};

export const customerPermissionIdAliases: Record<string, string[]> = {
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
      aliasesByPermissionId[alias.toLowerCase()] = canonicalId;
    });
    return aliasesByPermissionId;
  },
  {},
);

export const resolveCanonicalPermissionId = (permissionId: string) =>
  customerPermissionIdByAlias[permissionId] ?? customerPermissionIdByAlias[permissionId.toLowerCase()] ?? permissionId;
