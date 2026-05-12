export type BackendApiResource =
  | 'businesses'
  | 'businessCreate'
  | 'dashboardSummary'
  | 'departments'
  | 'departmentCreate'
  | 'accounts'
  | 'accountCreate'
  | 'accountDelete'
  | 'accountLinkDepartment'
  | 'customers'
  | 'employees'
  | 'transactions'
  | 'reports'
  | 'roles'
  | 'roleCreate'
  | 'roleUpdate'
  | 'roleDelete';

interface BackendApiResourceConfig {
  label: string;
  defaultPath?: string;
  envPathKey?: string;
  method?: 'GET' | 'POST';
  defaultBody?: Record<string, string>;
}

const backendApiResources: Record<BackendApiResource, BackendApiResourceConfig> = {
  businesses: {
    label: 'businesses',
    defaultPath: 'getUsers',
    method: 'POST',
    defaultBody: {
      page_no: '1',
      limit: '10',
      // role 2 is the backend's Business user role. Admin customer lists should
      // never include Admin or Employee accounts.
      role: '2',
    },
  },
  businessCreate: {
    label: 'create business user',
    defaultPath: 'createUserByAdmin',
    envPathKey: 'NEXT_PUBLIC_API_BUSINESS_CREATE_PATH',
    method: 'POST',
  },
  dashboardSummary: {
    label: 'dashboard summary',
    envPathKey: 'NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH',
  },
  departments: {
    label: 'departments',
    defaultPath: 'getCounters',
  },
  departmentCreate: {
    label: 'create department',
    defaultPath: 'createCounter',
    envPathKey: 'NEXT_PUBLIC_API_CREATE_DEPARTMENT_PATH',
    method: 'POST',
  },
  accounts: {
    label: 'accounts',
    defaultPath: 'getAccounts',
    envPathKey: 'NEXT_PUBLIC_API_ACCOUNTS_PATH',
  },
  accountCreate: {
    label: 'create account',
    defaultPath: 'createAccount',
    envPathKey: 'NEXT_PUBLIC_API_ACCOUNT_CREATE_PATH',
    method: 'POST',
  },
  accountDelete: {
    label: 'delete account',
    defaultPath: 'deleteAccount',
    envPathKey: 'NEXT_PUBLIC_API_ACCOUNT_DELETE_PATH',
    method: 'POST',
  },
  accountLinkDepartment: {
    label: 'link account to department',
    defaultPath: 'linkAccountToDepartment',
    envPathKey: 'NEXT_PUBLIC_API_ACCOUNT_LINK_DEPARTMENT_PATH',
    method: 'POST',
  },
  customers: {
    label: 'customers',
    envPathKey: 'NEXT_PUBLIC_API_CUSTOMERS_PATH',
  },
  employees: {
    label: 'employees',
    envPathKey: 'NEXT_PUBLIC_API_EMPLOYEES_PATH',
  },
  transactions: {
    label: 'transactions',
    envPathKey: 'NEXT_PUBLIC_API_TRANSACTIONS_PATH',
  },
  reports: {
    label: 'reports',
    envPathKey: 'NEXT_PUBLIC_API_REPORTS_PATH',
  },
  roles: {
    label: 'roles',
    defaultPath: 'getRoles',
    envPathKey: 'NEXT_PUBLIC_API_ROLES_PATH',
    method: 'POST',
  },
  roleCreate: {
    label: 'create role',
    defaultPath: 'createRoleByAdmin',
    envPathKey: 'NEXT_PUBLIC_API_ROLE_CREATE_PATH',
    method: 'POST',
  },
  roleUpdate: {
    label: 'update role',
    defaultPath: 'updateRoleByAdmin',
    envPathKey: 'NEXT_PUBLIC_API_ROLE_UPDATE_PATH',
    method: 'POST',
  },
  roleDelete: {
    label: 'delete role',
    defaultPath: 'deleteRoleByAdmin',
    envPathKey: 'NEXT_PUBLIC_API_ROLE_DELETE_PATH',
    method: 'POST',
  },
};

export const getBackendApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error('API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.');
  }

  return baseUrl.replace(/\/+$/, '');
};

export const getBackendApiResourceConfig = (resource: BackendApiResource) => {
  const config = backendApiResources[resource];
  const configuredPath = config.envPathKey ? process.env[config.envPathKey]?.trim() : null;

  return {
    ...config,
    path: configuredPath || config.defaultPath || null,
    method: config.method || 'GET',
    defaultBody: config.defaultBody,
  };
};
