import { AppApiError, requestAppApi, requestAppApiMutation } from './client';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export type ExpensePaymentMode = 'department' | 'account';

export interface ExpenseRecord {
  id: string;
  expenseId?: string;
  expenseCode?: string;
  title: string;
  expenseTypeId?: string;
  categoryId?: string;
  category?: string;
  counterId: string;
  counterName?: string;
  paymentMode: ExpensePaymentMode;
  paidFrom?: string;
  paidFromType?: ExpensePaymentMode;
  accountId?: string | null;
  accountName?: string;
  bankName?: string;
  amount: number;
  remark?: string | null;
  addedByName?: string;
  addedById?: string;
  status: number | string;
  date: string;
}

export interface ExpenseFilters {
  pageNo?: number;
  limit?: number;
  status?: number;
  counterId?: number | string;
  accountId?: number | string;
  staffId?: number | string;
  categoryId?: number | string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ExpenseMutationPayload {
  id?: number | string;
  title?: string;
  expenseTypeId?: number | string;
  categoryId?: number | string;
  category: string;
  amount: number;
  paidFromType: ExpensePaymentMode;
  accountId?: number | string | null;
  departmentId?: number | string | null;
  counterId?: number | string | null;
  remark?: string | null;
}

export interface ExpenseMutationResult {
  success: boolean;
  message: string;
  data?: unknown;
}

const normalizeMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): ExpenseMutationResult => {
  if (!isRecord(payload)) {
    return {
      success: false,
      message: fallbackMessage,
    };
  }

  return {
    success: payload.success === true || payload.status === true || payload.status === 1 || payload.status === '1',
    message: readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallbackMessage,
    data: payload.data,
  };
};

const handleExpenseMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof AppApiError) {
      return normalizeMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export const getExpenses = (filters: ExpenseFilters = {}) =>
  requestAppApiMutation('/api/expenses', {
    action: 'list',
    pageNo: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(filters.counterId ? { counterId: filters.counterId } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.staffId ? { staffId: filters.staffId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  });

export const createExpense = (payload: ExpenseMutationPayload) =>
  handleExpenseMutation(
    () => requestAppApiMutation('/api/expenses', {
      action: 'create',
      ...payload,
    }),
    'Expense saved successfully.',
  );

export const updateExpense = (payload: ExpenseMutationPayload & { id: number | string }) =>
  handleExpenseMutation(
    () => requestAppApi(`/api/expenses/${payload.id}`, { method: 'PUT', body: { ...payload } }),
    'Expense updated successfully.',
  );

export const deleteExpense = (expenseId: number | string) =>
  handleExpenseMutation(
    () => requestAppApi(`/api/expenses/${expenseId}`, { method: 'DELETE' }),
    'Expense deleted successfully.',
  );
