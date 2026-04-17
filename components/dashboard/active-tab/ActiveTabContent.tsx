'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const DashboardTab = dynamic(() => import('./DashboardTab'));
const ServicesTab = dynamic(() => import('./ServicesTab'));
const CustomersTab = dynamic(() => import('./CustomersTab'));
const ReminderTab = dynamic(() => import('./ReminderTab'));
const EmployeeTab = dynamic(() => import('./EmployeeTab'));
const DepartmentsTab = dynamic(() => import('./DepartmentsTab'));
const AccountsTab = dynamic(() => import('./AccountsTab'));
const TransactionsTab = dynamic(() => import('./TransactionsTab'));
const HistoryTab = dynamic(() => import('./HistoryTab'));
const ReportsTab = dynamic(() => import('./ReportsTab'));
const ExpenseTab = dynamic(() => import('./ExpenseTab'));
const AdditionsTab = dynamic(() => import('./AdditionsTab'));

const tabComponents: Record<string, React.ComponentType<{ ctx: any }>> = {
  dashboard: DashboardTab,
  services: ServicesTab,
  customers: CustomersTab,
  reminder: ReminderTab,
  employee: EmployeeTab,
  departments: DepartmentsTab,
  accounts: AccountsTab,
  transactions: TransactionsTab,
  history: HistoryTab,
  reports: ReportsTab,
  expense: ExpenseTab,
  additions: AdditionsTab,
};

interface ActiveTabContentProps {
  activeTab: string;
  ctx: any;
}

export default function ActiveTabContent({ activeTab, ctx }: ActiveTabContentProps) {
  const Content = tabComponents[activeTab] || DashboardTab;
  return <Content ctx={ctx} />;
}
