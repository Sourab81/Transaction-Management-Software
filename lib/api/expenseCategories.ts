import { AppApiError, requestAppApi, requestAppApiMutation } from './client';
import {
  extractCollectionItems,
  isRecord,
  readJoinedMessage,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from '../mappers/legacy-record';

export interface ExpenseCategory {
  id: string;
  name: string;
  remark?: string | null;
  status?: number | string;
  addedByName?: string;
  addedDate?: string;
}

export interface ExpenseCategoryMutationResult {
  success: boolean;
  message: string;
  data?: unknown;
}

const mapExpenseCategory = (record: UnknownRecord): ExpenseCategory | null => {
  const id = readStringValue(record, ['id', 'category_id', 'expense_category_id', 'categoryId']) || '';
  const name = readStringValue(record, ['name', 'category_name', 'expense_category_name', 'categoryName']) || '';

  if (!id || !name) return null;

  return {
    id,
    name,
    remark: readStringValue(record, ['remark', 'remarks', 'description']) || null,
    status: readStringValue(record, ['status']) || readNumberValue(record, ['status']) || 1,
    addedByName: readStringValue(record, ['added_by_name', 'addedByName', 'added_by']) || undefined,
    addedDate: readStringValue(record, ['added_date', 'addedDate', 'created_at', 'createdAt']) || undefined,
  };
};

export const mapExpenseCategoriesResponse = (payload: unknown) =>
  extractCollectionItems(payload, ['data', 'categories', 'items', 'rows', 'records']).reduce<ExpenseCategory[]>((categories, entry) => {
    if (!isRecord(entry)) return categories;

    const category = mapExpenseCategory(entry);
    if (category) categories.push(category);

    return categories;
  }, []);

const normalizeCategoryMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): ExpenseCategoryMutationResult => {
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

const handleCategoryMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeCategoryMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof AppApiError) {
      return normalizeCategoryMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export const getExpenseCategories = async () => requestAppApi('/api/expense-categories');

export const createExpenseCategory = (payload: { name: string; remark?: string | null; status?: number | string }) =>
  handleCategoryMutation(
    () => requestAppApiMutation('/api/expense-categories', {
      action: 'create',
      name: payload.name,
      remark: payload.remark ?? null,
      status: payload.status ?? 1,
    }),
    'Expense category saved successfully.',
  );

export const updateExpenseCategory = (payload: { id: string | number; name: string; remark?: string | null; status?: number | string }) =>
  handleCategoryMutation(
    () => requestAppApiMutation('/api/expense-categories', {
      action: 'update',
      ...payload,
    }),
    'Expense category updated successfully.',
  );

export const deleteExpenseCategory = (id: string | number) =>
  handleCategoryMutation(
    () => requestAppApiMutation('/api/expense-categories', {
      action: 'delete',
      id,
    }),
    'Expense category deleted successfully.',
  );
