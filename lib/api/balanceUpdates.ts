'use client';

import { DirectBackendError, directBackendGet, directBackendPost, directBackendPostRaw } from './direct-backend';
import {
  extractCollectionItems,
  isRecord,
  readJoinedMessage,
  readNumberValue,
  readStringValue,
} from '../mappers/legacy-record';

export type BalanceUpdateMode = 'department' | 'account';

export interface BalanceUpdateRecord {
  id: string;
  date: string;
  valueDate: string;
  mode: BalanceUpdateMode;
  departmentName?: string;
  accountName?: string;
  existingBalance: number;
  statementBalance: number;
  difference: number;
  remark?: string | null;
  userName: string;
}

export interface BalanceUpdateFilters {
  dateFrom?: string;
  dateTo?: string;
  mode: BalanceUpdateMode;
  pageNo?: number;
  limit?: number;
}

export interface CreateBalanceUpdatePayload {
  mode: BalanceUpdateMode;
  departmentId?: string;
  accountId?: string;
  existingBalance: number;
  statementBalance: number;
  valueDate?: string;
  remark: string;
}

export interface BalanceUpdateMutationResult {
  success: boolean;
  message: string;
  item?: unknown;
}

const appendBalanceUpdateFilters = (filters: BalanceUpdateFilters) => {
  const params = new URLSearchParams();

  params.set('mode', filters.mode);
  if (filters.dateFrom) params.set('from_date', filters.dateFrom);
  if (filters.dateTo) params.set('to_date', filters.dateTo);
  if (filters.pageNo) params.set('page_no', String(filters.pageNo));
  if (filters.limit) params.set('limit', String(filters.limit));

  return params.toString();
};

export const mapBalanceUpdateRecord = (record: Record<string, unknown>): BalanceUpdateRecord | null => {
  const id = readStringValue(record, ['id', 'update_id', 'balance_update_id', 'balanceUpdateId']);

  if (!id) return null;

  const mode = readStringValue(record, ['mode', 'update_mode', 'updateMode', 'type']);

  return {
    id,
    date: readStringValue(record, ['date', 'update_date', 'updateDate', 'created_at', 'createdAt', 'created_date']) || '',
    valueDate: readStringValue(record, ['value_date', 'valueDate', 'settlement_date', 'settlementDate']) || '',
    mode: mode === 'account' ? 'account' : 'department',
    departmentName: readStringValue(record, ['department_name', 'departmentName']) || undefined,
    accountName: readStringValue(record, ['account_name', 'accountName']) || undefined,
    existingBalance: readNumberValue(record, ['existing_balance', 'existingBalance', 'current_balance', 'currentBalance']) ?? 0,
    statementBalance: readNumberValue(record, ['statement_balance', 'statementBalance']) ?? 0,
    difference: readNumberValue(record, ['difference', 'diff', 'balance_diff', 'balanceDiff']) ?? 0,
    remark: readStringValue(record, ['remark', 'remarks', 'note']) || null,
    userName: readStringValue(record, ['user', 'user_name', 'userName', 'added_by_name', 'addedByName', 'added_by']) || '-',
  };
};

export const mapBalanceUpdatesResponse = (payload: unknown) =>
  extractCollectionItems(payload, ['data', 'updates', 'balanceUpdates', 'rows', 'records'])
    .reduce<BalanceUpdateRecord[]>((rows, entry) => {
      if (!isRecord(entry)) return rows;
      const row = mapBalanceUpdateRecord(entry);
      if (row) rows.push(row);
      return rows;
    }, []);

const normalizeMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): BalanceUpdateMutationResult => {
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

export const getBalanceUpdates = (filters: BalanceUpdateFilters) => {
  const query = appendBalanceUpdateFilters(filters);
  return directBackendGet(`balanceUpdates?${query}`);
};

export interface BatchUpdateItem {
  entityId: string;
  statementBalance: number;
  remark: string;
}

export interface CreateBalanceUpdateBatchPayload {
  mode: BalanceUpdateMode;
  updates: BatchUpdateItem[];
}

export const createBalanceUpdatesBatch = async (payload: CreateBalanceUpdateBatchPayload) => {
  try {
    const parts: string[] = [];
    parts.push(`mode=${encodeURIComponent(payload.mode)}`);
    payload.updates.forEach((update, index) => {
      parts.push(`updates[${index}][entity_id]=${encodeURIComponent(update.entityId)}`);
      parts.push(`updates[${index}][statement_balance]=${encodeURIComponent(String(update.statementBalance))}`);
      if (update.remark) {
        parts.push(`updates[${index}][remark]=${encodeURIComponent(update.remark)}`);
      }
    });
    const raw = await directBackendPostRaw('balanceUpdateBatch', parts.join('&'));
    console.log('[BalanceUpdate] RAW BACKEND RESPONSE:', JSON.stringify(raw, null, 2));
    console.log('[BalanceUpdate] isRecord:', typeof raw === 'object' && raw !== null && !Array.isArray(raw));
    if (typeof raw === 'object' && raw !== null) {
      console.log('[BalanceUpdate] success field:', (raw as Record<string, unknown>).success);
      console.log('[BalanceUpdate] status field:', (raw as Record<string, unknown>).status);
      console.log('[BalanceUpdate] message field:', (raw as Record<string, unknown>).message);
    }
    return normalizeMutationResult(raw, 'Balance updates saved successfully.');
  } catch (error) {
    console.log('[BalanceUpdate] CATCH ERROR:', error instanceof Error ? error.message : error);
    if (error instanceof DirectBackendError) {
      console.log('[BalanceUpdate] StatusCode:', error.statusCode);
      console.log('[BalanceUpdate] Error body:', error.body);
      return normalizeMutationResult(error.body, error.message || 'Unable to save balance updates.');
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unable to save balance updates.',
    };
  }
};

export const createBalanceUpdate = async (payload: CreateBalanceUpdatePayload) => {
  try {
    return normalizeMutationResult(
      await directBackendPost('balanceUpdate', {
        mode: payload.mode,
        ...(payload.mode === 'department'
          ? { department_id: payload.departmentId }
          : { account_id: payload.accountId }),
        statement_balance: payload.statementBalance,
        value_date: payload.valueDate ?? null,
        remark: payload.remark,
      }),
      'Balance update saved successfully.',
    );
  } catch (error) {
    if (error instanceof DirectBackendError) {
      return normalizeMutationResult(error.body, error.message || 'Unable to save balance update.');
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unable to save balance update.',
    };
  }
};
