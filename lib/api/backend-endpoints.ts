export type BackendApiResource =
  | 'dashboardSummary'
  | 'departments'
  | 'customers'
  | 'employees'
  | 'transactions'
  | 'reports';

interface BackendApiResourceConfig {
  label: string;
  defaultPath?: string;
  envPathKey?: string;
}

const backendApiResources: Record<BackendApiResource, BackendApiResourceConfig> = {
  dashboardSummary: {
    label: 'dashboard summary',
    envPathKey: 'NEXT_PUBLIC_API_DASHBOARD_SUMMARY_PATH',
  },
  departments: {
    label: 'departments',
    defaultPath: 'getCounters',
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
  };
};

