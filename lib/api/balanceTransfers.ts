'use client';

import { DirectBackendError, directBackendGet, directBackendPost } from './direct-backend';
import {
  extractCollectionItems,
  isRecord,
  readJoinedMessage,
  readNumberValue,
  readStringValue,
} from '../mappers/legacy-record';

export type BalanceTransferMode = 'department' | 'account';

export interface BalanceTransferRecord {
  id: string;
  date: string;
  mode: BalanceTransferMode;
  fromName: string;
  toName: string;
  amount: number;
  remark?: string | null;
  userName: string;
}

export interface BalanceTransferFilters {
  dateFrom?: string;
  dateTo?: string;
  mode: BalanceTransferMode;
  pageNo?: number;
  limit?: number;
}

export interface CreateBalanceTransferPayload {
  mode: BalanceTransferMode;
  fromId: string;
  toId: string;
  amount: number;
  remark?: string | null;
}

export interface BalanceTransferMutationResult {
  success: boolean;
  message: string;
  item?: unknown;
}

const appendBalanceTransferFilters = (filters: BalanceTransferFilters) => {
  const params = new URLSearchParams();

  params.set('mode', filters.mode);
  if (filters.dateFrom) params.set('from_date', filters.dateFrom);
  if (filters.dateTo) params.set('to_date', filters.dateTo);
  if (filters.pageNo) params.set('page_no', String(filters.pageNo));
  if (filters.limit) params.set('limit', String(filters.limit));

  return params.toString();
};

export const mapBalanceTransferRecord = (record: Record<string, unknown>): BalanceTransferRecord | null => {
  const id = readStringValue(record, ['id', 'transfer_id', 'balance_transfer_id', 'balanceTransferId']);

  if (!id) return null;

  const mode = readStringValue(record, ['mode', 'transfer_mode', 'transferMode', 'type']);

  return {
    id,
    date: readStringValue(record, ['date', 'transfer_date', 'transferDate', 'created_at', 'createdAt']) || '',
    mode: mode === 'account' ? 'account' : 'department',
    fromName: readStringValue(record, [
      'from_name',
      'fromName',
      'from_department_name',
      'fromDepartmentName',
      'from_account_name',
      'fromAccountName',
      'from_bank',
      'fromBank',
    ]) || '-',
    toName: readStringValue(record, [
      'to_name',
      'toName',
      'to_department_name',
      'toDepartmentName',
      'to_account_name',
      'toAccountName',
      'to_bank',
      'toBank',
    ]) || '-',
    amount: readNumberValue(record, ['amount', 'transfer_amount', 'transferAmount']) ?? 0,
    remark: readStringValue(record, ['remark', 'remarks', 'note']) || null,
    userName: readStringValue(record, ['user', 'user_name', 'userName', 'added_by_name', 'addedByName', 'added_by']) || '-',
  };
};

export const mapBalanceTransfersResponse = (payload: unknown) =>
  extractCollectionItems(payload, ['data', 'transfers', 'balanceTransfers', 'rows', 'records'])
    .reduce<BalanceTransferRecord[]>((rows, entry) => {
      if (!isRecord(entry)) return rows;
      const row = mapBalanceTransferRecord(entry);
      if (row) rows.push(row);
      return rows;
    }, []);

const normalizeMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): BalanceTransferMutationResult => {
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

export const getBalanceTransfers = (filters: BalanceTransferFilters) => {
  const query = appendBalanceTransferFilters(filters);
  return directBackendGet(`balanceTransfers?${query}`);
};

export const createBalanceTransfer = async (payload: CreateBalanceTransferPayload) => {
  try {
    return normalizeMutationResult(
      await directBackendPost('balanceTransfer', {
        mode: payload.mode,
        from_id: payload.fromId,
        to_id: payload.toId,
        amount: payload.amount,
        remark: payload.remark ?? null,
      }),
      'Balance transfer saved successfully.',
    );
  } catch (error) {
    if (error instanceof DirectBackendError) {
      return normalizeMutationResult(error.body, error.message || 'Unable to save balance transfer.');
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unable to save balance transfer.',
    };
  }
};
