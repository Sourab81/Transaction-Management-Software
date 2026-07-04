'use client';

import { DirectBackendError, directBackendPost } from './direct-backend';
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
    if (error instanceof DirectBackendError) {
      return normalizeMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

const buildBackendPayload = (payload: ExpenseMutationPayload, id?: number | string) => {
  const category = payload.category;
  const title = payload.title || category;
  const paidFromType = payload.paidFromType.toLowerCase();

  const body: Record<string, unknown> = {
    title,
    expense_title: title,
    category,
    amount: payload.amount,
    paid_from_type: paidFromType,
    department_id: payload.departmentId ?? payload.counterId ?? null,
  };

  if (paidFromType === 'account') {
    body.account_id = payload.accountId ?? null;
  }

  if (id) {
    body.id = id;
    body.expense_id = id;
  }

  if (payload.expenseTypeId) {
    body.expense_type_id = payload.expenseTypeId;
  }
  if (payload.categoryId) {
    body.category_id = payload.categoryId;
  }
  if (payload.remark) {
    body.remark = payload.remark;
  }

  return body;
};

export const getExpenses = (filters: ExpenseFilters = {}) =>
  directBackendPost('getExpenses', {
    page_no: filters.pageNo ?? 1,
    limit: filters.limit ?? 10,
    status: filters.status ?? 1,
    ...(filters.counterId ? { counter_id: filters.counterId } : {}),
    ...(filters.accountId ? { account_id: filters.accountId } : {}),
    ...(filters.staffId ? { staff_id: filters.staffId } : {}),
    ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  });

export const createExpense = (payload: ExpenseMutationPayload) =>
  handleExpenseMutation(
    () => directBackendPost('createExpense', buildBackendPayload(payload)),
    'Expense saved successfully.',
  );

export const updateExpense = (payload: ExpenseMutationPayload & { id: number | string }) =>
  handleExpenseMutation(
    () => directBackendPost('updateExpense', buildBackendPayload(payload, payload.id)),
    'Expense updated successfully.',
  );

export const deleteExpense = (expenseId: number | string) =>
  handleExpenseMutation(
    () => directBackendPost('deleteExpense', { id: expenseId, expense_id: expenseId }),
    'Expense deleted successfully.',
  );
