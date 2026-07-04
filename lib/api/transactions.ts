'use client';

import { DirectBackendError, directBackendPost } from './direct-backend';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export interface Transaction {
  transactionId: number | string;
  invoiceId: string;
  date: string;
  customerId: number | string;
  customerCode?: string;
  counterId: number | string;
  counterName?: string;
  numberOfTransactions: number;
  transactionAmount: number;
  serviceCharge: number;
  bankCharge: number;
  otherCharge: number;
  totalAmount: number;
  currentBalance?: number;
  addedByName?: string;
  status: number;
  addedDate?: string;
}

export interface TransactionChild {
  id?: number | string;
  transactionId?: number | string;
  formName: string;
  noOfTransaction: number;
  inventoryId: number | string;
  inventoryName?: string;
  transactionAccount: number | string;
  amount: number;
  serviceCharge: number;
  bankCharge: number;
  otherCharge: number;
  totalAmount: number;
  remark?: string | null;
}

export interface TransactionSummary {
  transactionId: number | string;
  invoiceId: string;
  date: string;
  customerId: number | string;
  customerCode?: string;
  counterId: number | string;
  counterName?: string;
  numberOfTransactions: number;
  transactionAmount: number;
  totalAmount: number;
  currentBalance?: number;
  addedByName?: string;
  status: number;
  addedDate?: string;
  rows?: TransactionChild[];
}

export interface TransactionFilters {
  pageNo?: number;
  limit?: number;
  status?: number;
  search?: string;
  transactionId?: number | string;
  customerId?: number | string;
  counterId?: number | string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateTransactionPayload {
  customerId: number | string;
  counterId: number | string;
  date?: string;
  rows: TransactionChild[];
}

export interface UpdateTransactionPayload {
  transactionId: number | string;
  customerId?: number | string;
  counterId?: number | string;
  rows?: TransactionChild[];
  removedRowIds?: Array<number | string>;
  status?: number;
}

export interface PayTransactionPayload {
  transactionId: number | string;
  customerId: number | string;
  counterId?: number | string | null;
  onlineAmount: number;
  cashAmount: number;
  accountId?: number | string | null;
  remark?: string | null;
}

export interface TransactionMutationResult {
  success: boolean;
  message: string;
  transaction?: unknown;
}

const normalizeTransactionMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): TransactionMutationResult => {
  if (!isRecord(payload)) {
    return {
      success: false,
      message: fallbackMessage,
    };
  }

  const message = readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallbackMessage;
  const success = payload.success === true || payload.status === true || payload.status === 1 || payload.status === '1';

  return {
    success,
    message,
    ...(payload.transaction ? { transaction: payload.transaction } : {}),
    ...(payload.item ? { transaction: payload.item } : {}),
    ...(payload.data ? { transaction: payload.data } : {}),
  };
};

const handleTransactionMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeTransactionMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof DirectBackendError) {
      return normalizeTransactionMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export interface TransactionRequestOptions {
  signal?: AbortSignal;
}

const buildTransactionListBody = (filters: TransactionFilters = {}) => {
  const body: Record<string, unknown> = {
    page_no: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
  };

  if (filters.search?.trim()) body.search = filters.search.trim();
  if (typeof filters.transactionId !== 'undefined') body.transaction_id = filters.transactionId;
  if (typeof filters.customerId !== 'undefined') body.customer_id = filters.customerId;
  if (typeof filters.counterId !== 'undefined') body.counter_id = filters.counterId;
  if (typeof filters.date !== 'undefined') body.date = filters.date;
  if (typeof filters.dateFrom !== 'undefined') body.date_from = filters.dateFrom;
  if (typeof filters.dateTo !== 'undefined') body.date_to = filters.dateTo;

  return body;
};

const mapChildRows = (rows: TransactionChild[]) =>
  rows.map((row) => ({
    form_name: row.formName,
    no_of_transaction: row.noOfTransaction,
    inventory_id: row.inventoryId,
    transaction_account: row.transactionAccount,
    amount: row.amount,
    service_charge: row.serviceCharge ?? 0,
    bank_charge: row.bankCharge ?? 0,
    other_charge: row.otherCharge ?? 0,
    total_amount: row.totalAmount,
    ...(row.id ? { id: row.id, transaction_child_id: row.id } : {}),
    ...(row.remark ? { remark: row.remark } : {}),
  }));

export const getTransactions = (
  filters: TransactionFilters = {},
  options: TransactionRequestOptions = {},
) =>
  directBackendPost('getTransactions', buildTransactionListBody(filters), options.signal);

export const getTransactionById = (id: string | number) =>
  directBackendPost('getTransactions', { transaction_id: id, page_no: 1, limit: 1, status: 1 });

export const createTransaction = (payload: CreateTransactionPayload) =>
  handleTransactionMutation(
    () => directBackendPost('createTransaction', {
      customer_id: payload.customerId,
      counter_id: payload.counterId,
      rows: JSON.stringify(mapChildRows(payload.rows)),
      ...(payload.date ? { date: payload.date } : {}),
    }),
    'Transaction created successfully.',
  );

export const updateTransaction = (payload: UpdateTransactionPayload) =>
  handleTransactionMutation(
    () => directBackendPost('updateTransaction', {
      transaction_id: payload.transactionId,
      ...(payload.customerId ? { customer_id: payload.customerId } : {}),
      ...(payload.counterId ? { counter_id: payload.counterId } : {}),
      ...(payload.rows ? { rows: JSON.stringify(mapChildRows(payload.rows)) } : {}),
      ...(payload.removedRowIds ? { removed_row_ids: JSON.stringify(payload.removedRowIds) } : {}),
      ...(typeof payload.status !== 'undefined' ? { status: payload.status } : {}),
    }),
    'Transaction updated successfully.',
  );

export const deleteTransaction = (transactionId: number | string) =>
  handleTransactionMutation(
    () => directBackendPost('deleteTransaction', { transaction_id: transactionId }),
    'Transaction deleted successfully.',
  );

export const payTransaction = (payload: PayTransactionPayload) =>
  handleTransactionMutation(
    () => directBackendPost('payTransaction', {
      transaction_id: payload.transactionId,
      customer_id: payload.customerId,
      online_amount: payload.onlineAmount,
      cash_amount: payload.cashAmount,
      ...(payload.counterId ? { counter_id: payload.counterId } : {}),
      ...(payload.accountId ? { account_id: payload.accountId } : {}),
      ...(payload.remark ? { remark: payload.remark } : {}),
    }),
    'Transaction payment saved successfully.',
  );
