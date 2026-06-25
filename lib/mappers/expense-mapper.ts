import type { ExpenseRecord, ExpensePaymentMode } from '../api/expenses';
import {
  extractCollectionItems,
  isRecord,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

const normalizePaymentMode = (value: string | null): ExpensePaymentMode => (
  value?.trim().toLowerCase() === 'account' ? 'account' : 'department'
);

export const mapExpenseRecord = (record: UnknownRecord): ExpenseRecord | null => {
  const id = readStringValue(record, ['id', 'expense_id', 'expenseId']) || '';
  const title = readStringValue(record, ['title', 'expense_title', 'expenseTitle', 'category_name', 'category', 'name']) || '';

  if (!id || !title) return null;

  return {
    id,
    expenseId: readStringValue(record, ['expense_id', 'expenseId']) || id,
    expenseCode: readStringValue(record, ['expense_code', 'expenseCode', 'code']) || undefined,
    title,
    categoryId: readStringValue(record, ['category_id', 'categoryId']) || undefined,
    category: readStringValue(record, ['category', 'category_name', 'categoryName']) || undefined,
    counterId: readStringValue(record, ['counter_id', 'counterId', 'department_id', 'departmentId']) || '',
    counterName: readStringValue(record, ['counter_name', 'counterName', 'department_name', 'departmentName']) || undefined,
    paymentMode: normalizePaymentMode(readStringValue(record, ['payment_mode', 'paymentMode'])),
    accountId: readStringValue(record, ['account_id', 'accountId']) || null,
    accountName: readStringValue(record, ['account_name', 'accountName', 'bank_name', 'bankName']) || undefined,
    bankName: readStringValue(record, ['bank_name', 'bankName']) || undefined,
    amount: readNumberValue(record, ['amount', 'expense_amount', 'expenseAmount']) || 0,
    remark: readStringValue(record, ['remark', 'remarks', 'notes', 'note']) || null,
    addedByName: readStringValue(record, ['added_by_name', 'addedByName']) || undefined,
    addedById: readStringValue(record, ['added_by', 'addedBy', 'staff_id', 'staffId', 'user_id', 'userId']) || undefined,
    status: readStringValue(record, ['status']) || readNumberValue(record, ['status']) || 1,
    date: readStringValue(record, ['date', 'expense_date', 'expenseDate', 'added_date', 'addedDate']) || '',
  };
};

export const mapExpensesResponse = (payload: unknown) => (
  extractCollectionItems(payload, ['data', 'expenses', 'items', 'rows', 'records']).reduce<ExpenseRecord[]>((expenses, entry) => {
    if (!isRecord(entry)) return expenses;

    const mappedExpense = mapExpenseRecord(entry);
    if (mappedExpense) expenses.push(mappedExpense);

    return expenses;
  }, [])
);
