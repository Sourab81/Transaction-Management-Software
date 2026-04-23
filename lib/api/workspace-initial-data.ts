import { cookies } from 'next/headers';
import type { BusinessCustomer, Counter, Employee, ReportItem, Transaction } from '../store';
import { AUTH_TOKEN_COOKIE_NAME } from '../auth-cookie';
import {
  BackendApiConfigurationError,
  requestBackendCollection,
} from './backend-client';
import type { BackendApiResource } from './backend-endpoints';
import { mapCountersResponse } from '../mappers/counter-mapper';
import { mapCustomersResponse } from '../mappers/customer-mapper';
import {
  mapDashboardSummaryResponse,
  type DashboardSummary,
} from '../mappers/dashboard-summary-mapper';
import { mapEmployeesResponse } from '../mappers/employee-mapper';
import { mapReportsResponse } from '../mappers/report-mapper';
import { mapTransactionsResponse } from '../mappers/transaction-mapper';

export interface WorkspaceInitialData {
  counters?: Counter[];
  customers?: BusinessCustomer[];
  employees?: Employee[];
  transactions?: Transaction[];
  reports?: ReportItem[];
  dashboardSummary?: DashboardSummary | null;
}

const readWorkspaceResource = async <T>(
  token: string | null,
  resource: BackendApiResource,
  mapResponse: (payload: unknown) => T,
): Promise<T | undefined> => {
  if (!token) {
    return undefined;
  }

  try {
    const response = await requestBackendCollection(resource, token);

    if (response.statusCode >= 400) {
      return undefined;
    }

    return mapResponse(response.body);
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      return undefined;
    }

    return undefined;
  }
};

export const getInitialWorkspaceData = async (): Promise<WorkspaceInitialData> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim() || null;

  const [
    counters,
    customers,
    employees,
    transactions,
    reports,
    dashboardSummary,
  ] = await Promise.all([
    readWorkspaceResource(token, 'departments', mapCountersResponse),
    readWorkspaceResource(token, 'customers', mapCustomersResponse),
    readWorkspaceResource(token, 'employees', mapEmployeesResponse),
    readWorkspaceResource(token, 'transactions', mapTransactionsResponse),
    readWorkspaceResource(token, 'reports', mapReportsResponse),
    readWorkspaceResource(token, 'dashboardSummary', mapDashboardSummaryResponse),
  ]);

  return {
    counters,
    customers,
    employees,
    transactions,
    reports,
    dashboardSummary,
  };
};
