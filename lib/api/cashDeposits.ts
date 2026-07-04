'use client';

import { DirectBackendError, directBackendPost, directBackendGet } from './direct-backend';
import {
  extractCollectionItems,
  isRecord,
  readJoinedMessage,
  readNumberValue,
  readRecordValue,
  readStringValue,
} from '../mappers/legacy-record';

export interface CashDepositRecord {
  id: string;
  date: string;
  departmentName: string;
  amount: number;
  toBank: string;
  remark?: string | null;
  userName: string;
}

export interface CashDepositSummary {
  todayDeposits: number;
  todayTotalAmount: number;
}

export interface CashDepositFilters {
  date?: string;
  pageNo?: number;
  limit?: number;
}

export interface CreateCashDepositPayload {
  accountId: string;
  amount: number;
  remark?: string | null;
  departmentId?: string;
}

export interface CashDepositMutationResult {
  success: boolean;
  message: string;
  item?: unknown;
}

const appendCashDepositFilters = (filters: CashDepositFilters = {}) => {
  const params = new URLSearchParams();

  if (filters.date) params.set('date', filters.date);
  if (filters.pageNo) params.set('page_no', String(filters.pageNo));
  if (filters.limit) params.set('limit', String(filters.limit));

  return params.toString();
};

export const mapCashDepositRecord = (record: Record<string, unknown>): CashDepositRecord | null => {
  const id = readStringValue(record, ['id', 'deposit_id', 'cash_deposit_id', 'cashDepositId']);

  if (!id) return null;

  return {
    id,
    date: readStringValue(record, ['date', 'deposit_date', 'depositDate', 'created_at', 'createdAt']) || '',
    departmentName: readStringValue(record, ['department_name', 'departmentName', 'counter_name', 'counterName']) || '-',
    amount: readNumberValue(record, ['amount', 'deposit_amount', 'depositAmount']) ?? 0,
    toBank: readStringValue(record, ['to_bank', 'toBank', 'bank_name', 'bankName', 'account_name', 'accountName']) || '-',
    remark: readStringValue(record, ['remark', 'remarks', 'note']) || null,
    userName: readStringValue(record, ['user', 'user_name', 'userName', 'added_by_name', 'addedByName', 'added_by']) || '-',
  };
};

export const mapCashDepositsResponse = (payload: unknown) =>
  extractCollectionItems(payload, ['data', 'deposits', 'cashDeposits', 'rows', 'records'])
    .reduce<CashDepositRecord[]>((rows, entry) => {
      if (!isRecord(entry)) return rows;
      const row = mapCashDepositRecord(entry);
      if (row) rows.push(row);
      return rows;
    }, []);

export const mapCashDepositSummary = (payload: unknown): CashDepositSummary => {
  const source = isRecord(payload) ? payload : null;
  const summary = readRecordValue(source, ['summary', 'totals', 'meta']);

  return {
    todayDeposits: readNumberValue(summary, ['today_deposits', 'todayDeposits', 'count']) ?? 0,
    todayTotalAmount: readNumberValue(summary, ['today_total_amount', 'todayTotalAmount', 'total_amount', 'totalAmount']) ?? 0,
  };
};

const normalizeMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): CashDepositMutationResult => {
  if (!isRecord(payload)) {
    return {
      success: false,
      message: fallbackMessage,
    };
  }

  const success = payload.success === true || payload.status === true || payload.status === 1 || payload.status === '1';
  const message = readJoinedMessage(payload.message) || fallbackMessage;

  return {
    success,
    message,
    ...(payload.data ? { item: payload.data } : {}),
  };
};

export const getCashDeposits = (filters: CashDepositFilters = {}) => {
  const query = appendCashDepositFilters(filters);
  const endpoint = query ? `cashDeposits?${query}` : 'cashDeposits';
  return directBackendGet(endpoint);
};

export const createCashDeposit = async (payload: CreateCashDepositPayload) => {
  try {
    return normalizeMutationResult(
      await directBackendPost('cashDeposit', {
        account_id: payload.accountId,
        amount: payload.amount,
        remark: payload.remark ?? null,
        ...(payload.departmentId ? { department_id: payload.departmentId, counter_id: payload.departmentId } : {}),
      }),
      'Cash deposit saved successfully.',
    );
  } catch (error) {
    if (error instanceof DirectBackendError) {
      return normalizeMutationResult(error.body, error.message || 'Unable to save cash deposit.');
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unable to save cash deposit.',
    };
  }
};
