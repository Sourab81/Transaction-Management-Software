import type { Account, Business, BusinessCustomer, Counter, Employee, ReportItem, Transaction } from '../store';
import {
  type DashboardSummary,
} from '../mappers/dashboard-summary-mapper';

export interface WorkspaceInitialData {
  businesses?: Business[];
  counters?: Counter[];
  prefetchedCounters?: boolean;
  accounts?: Account[];
  customers?: BusinessCustomer[];
  employees?: Employee[];
  transactions?: Transaction[];
  reports?: ReportItem[];
  dashboardSummary?: DashboardSummary | null;
}
