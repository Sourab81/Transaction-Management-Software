import { AppApiError, requestAppApi, requestAppApiMutation } from './client';
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
    if (error instanceof AppApiError) {
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

export const buildTransactionsListPath = (filters: TransactionFilters = {}) => {
  const params = new URLSearchParams();
  const search = filters.search?.trim();

  if (search) params.set('search', search);
  params.set('pageNo', String(filters.pageNo ?? 1));
  params.set('limit', String(filters.limit ?? 10));
  params.set('status', String(filters.status ?? 1));
  if (typeof filters.transactionId !== 'undefined') params.set('transactionId', String(filters.transactionId));
  if (typeof filters.customerId !== 'undefined') params.set('customerId', String(filters.customerId));
  if (typeof filters.counterId !== 'undefined') params.set('counterId', String(filters.counterId));
  if (typeof filters.date !== 'undefined') params.set('date', filters.date);
  if (typeof filters.dateFrom !== 'undefined') params.set('dateFrom', filters.dateFrom);
  if (typeof filters.dateTo !== 'undefined') params.set('dateTo', filters.dateTo);

  return `/api/transactions?${params.toString()}`;
};

export const getTransactions = (
  filters: TransactionFilters = {},
  options: TransactionRequestOptions = {},
) => requestAppApi(buildTransactionsListPath(filters), {
  signal: options.signal,
});

export const getTransactionById = (id: string | number) =>
  requestAppApi(`/api/transactions/${encodeURIComponent(String(id))}`);

export const createTransaction = (payload: CreateTransactionPayload) =>
  handleTransactionMutation(
    () => requestAppApiMutation('/api/transactions', {
      action: 'create',
      ...payload,
    }),
    'Transaction created successfully.',
  );

export const updateTransaction = (payload: UpdateTransactionPayload) =>
  handleTransactionMutation(
    () => requestAppApiMutation('/api/transactions', {
      action: 'update',
      ...payload,
    }),
    'Transaction updated successfully.',
  );

export const deleteTransaction = (transactionId: number | string) =>
  handleTransactionMutation(
    () => requestAppApiMutation('/api/transactions', {
      action: 'delete',
      transactionId,
    }),
    'Transaction deleted successfully.',
  );

export const payTransaction = (payload: PayTransactionPayload) =>
  handleTransactionMutation(
    () => requestAppApiMutation('/api/transactions', {
      action: 'pay',
      ...payload,
    }),
    'Transaction payment saved successfully.',
  );
