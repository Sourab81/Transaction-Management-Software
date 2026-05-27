import { AppApiError, requestAppApiMutation } from './client';
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
  customerId?: number | string;
  counterId?: number | string;
  date?: string;
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
  status?: number;
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

export const getTransactions = (filters: TransactionFilters = {}) =>
  requestAppApiMutation('/api/transactions', {
    action: 'list',
    pageNo: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(typeof filters.customerId !== 'undefined' ? { customerId: filters.customerId } : {}),
    ...(typeof filters.counterId !== 'undefined' ? { counterId: filters.counterId } : {}),
    ...(typeof filters.date !== 'undefined' ? { date: filters.date } : {}),
  });

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
