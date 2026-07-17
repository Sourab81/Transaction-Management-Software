import type { DailyReportRecord } from '../api/dailyReports';
import type { Transaction } from '../store';

export interface ServiceChargeRow {
  user: string;
  serviceCharge: number;
  bankCharge: number;
  otherCharge: number;
  count: number;
}

export interface EntityActivityRow {
  id: string;
  name: string;
  type: 'Department' | 'Account';
  transactionAmount: number;
  noOfTx: number;
  openingBalance: number;
  closingBalance: number;
  diff: number;
}

export interface ExpenseInfoRow {
  category: string;
  amount: number;
}

export interface EntityBalance {
  name: string;
  type: 'Department' | 'Account';
  openingBalance: number;
  closingBalance: number;
}

export interface NetDetails {
  totalOpeningBalance: number;
  totalClosingBalance: number;
  entityBalances: EntityBalance[];
  accountDiff: number;
  sumOutstanding: number;
  totalExpense: number;
  totalCharges: number;
  grandTotal: number;
}

export interface ParsedDailyReport {
  serviceCharges: ServiceChargeRow[];
  entityActivity: EntityActivityRow[];
  expenseInfo: ExpenseInfoRow[];
  netDetails: NetDetails;
}

export const parseDailyReport = (record: DailyReportRecord): ParsedDailyReport | null => {
  try {
    return {
      serviceCharges: record.service_charges ? JSON.parse(record.service_charges) : [],
      entityActivity: record.entity_activity ? JSON.parse(record.entity_activity) : [],
      expenseInfo: record.expense_info ? JSON.parse(record.expense_info) : [],
      netDetails: record.net_details ? { ...{
        totalOpeningBalance: 0,
        totalClosingBalance: 0,
        entityBalances: [],
        accountDiff: 0,
        sumOutstanding: 0,
        totalExpense: 0,
        totalCharges: 0,
        grandTotal: 0,
        tax: 0,
      }, ...JSON.parse(record.net_details) } : {
        totalOpeningBalance: 0,
        totalClosingBalance: 0,
        entityBalances: [],
        accountDiff: 0,
        sumOutstanding: 0,
        totalExpense: 0,
        totalCharges: 0,
        grandTotal: 0,
        tax: 0,
      },
    };
  } catch {
    return null;
  }
};

export const serializeServiceCharges = (
  rows: Array<{ user: string; serviceCharge: number; bankCharge: number; otherCharge: number; count: number }>,
): string => JSON.stringify(rows);

export const serializeEntityActivity = (rows: EntityActivityRow[]): string => JSON.stringify(rows);

export const serializeExpenseInfo = (rows: ExpenseInfoRow[]): string => JSON.stringify(rows);

export const serializeNetDetails = (details: NetDetails): string => JSON.stringify(details);
