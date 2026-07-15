'use client';

import React, { useMemo, useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Account, Counter } from '../../lib/store';
import type { ExpenseCategory } from '../../lib/api/expenseCategories';
import type { ExpenseMutationPayload, ExpensePaymentMode, ExpenseRecord } from '../../lib/api/expenses';
import ConfirmActionModal from '../ui/state/ConfirmActionModal';

interface ExpenseEntryFormProps {
  accounts: Account[];
  categories: ExpenseCategory[];
  departments: Counter[];
  initialValues?: ExpenseRecord;
  defaultDepartmentId?: string;
  isSubmitting?: boolean;
  submitError?: string;
  submitLabel?: string;
  onSubmit: (payload: ExpenseMutationPayload) => boolean | void | Promise<boolean | void>;
  onCancel?: () => void;
}

type PaidFromValue = `department:${string}` | `account:${string}` | '';

const formatMoney = (amount: number | undefined) => `${(amount ?? 0).toLocaleString('en-IN')}`;

const parsePaidFromValue = (value: PaidFromValue): { type: ExpensePaymentMode; id: string } | null => {
  if (!value) return null;
  const [type, id] = value.split(':') as [ExpensePaymentMode, string];
  if ((type !== 'department' && type !== 'account') || !id) return null;
  return { type, id };
};

const ExpenseEntryForm: React.FC<ExpenseEntryFormProps> = ({
  accounts,
  categories,
  departments,
  initialValues,
  defaultDepartmentId = '',
  isSubmitting = false,
  submitError = '',
  submitLabel = 'Save Expense',
  onSubmit,
  onCancel,
}) => {
  const currentDepartment = useMemo(() => (
    departments.find((department) => department.id === defaultDepartmentId)
    || departments.find((department) => department.id === initialValues?.counterId)
    || null
  ), [defaultDepartmentId, departments, initialValues?.counterId]);
  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'Active'),
    [accounts],
  );
  const initialPaidFromValue: PaidFromValue = initialValues?.paymentMode === 'account' && initialValues.accountId
    ? `account:${initialValues.accountId}`
    : currentDepartment
      ? `department:${currentDepartment.id}`
      : '';
  const initialCategoryId = initialValues?.categoryId || '';
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [category, setCategory] = useState(initialValues?.category || '');
  const [paidFromValue, setPaidFromValue] = useState<PaidFromValue>(initialPaidFromValue);
  const [amount, setAmount] = useState(initialValues ? String(initialValues.amount) : '');
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [validationError, setValidationError] = useState('');
  const [pendingPayload, setPendingPayload] = useState<ExpenseMutationPayload | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((entry) => entry.id === categoryId) || null,
    [categoryId, categories],
  );
  const selectedPaidFrom = parsePaidFromValue(paidFromValue);
  const selectedAccount = selectedPaidFrom?.type === 'account'
    ? activeAccounts.find((account) => account.id === selectedPaidFrom.id) || null
    : null;
  const selectedDepartment = selectedPaidFrom?.type === 'department'
    ? currentDepartment
    : null;
  const balanceSource = selectedAccount || selectedDepartment;
  const paidFromLabel = selectedPaidFrom?.type === 'account'
    ? selectedAccount
      ? `Account - ${selectedAccount.bankName}`
      : 'Account'
    : selectedDepartment
      ? `Department - ${selectedDepartment.name}`
      : 'Department';

  const resetForm = () => {
    setCategoryId('');
    setCategory('');
    setPaidFromValue(currentDepartment ? `department:${currentDepartment.id}` : '');
    setAmount('');
    setRemark('');
    setValidationError('');
    setPendingPayload(null);
  };

  const buildPayload = () => {
    const parsedAmount = parseNonNegativeNumber(amount);
    const resolvedCategory = selectedCategory?.name || category.trim();
    const paidFrom = parsePaidFromValue(paidFromValue);
    const currentDepartmentId = currentDepartment?.id || defaultDepartmentId;

    if (!resolvedCategory) {
      return 'Expense Type is required.';
    }
    if (!paidFrom) {
      return 'Paid From is required.';
    }
    if (paidFrom.type === 'department' && !currentDepartmentId) {
      return 'Current department is required.';
    }
    if (paidFrom.type === 'account' && !paidFrom.id) {
      return 'Account is required.';
    }
    if (parsedAmount === null || parsedAmount <= 0) {
      return 'Amount must be greater than 0.';
    }

    return {
      ...(initialValues ? { id: initialValues.id } : {}),
      title: resolvedCategory,
      expenseTypeId: categoryId || undefined,
      categoryId: categoryId || undefined,
      category: resolvedCategory,
      amount: parsedAmount,
      paidFromType: paidFrom.type,
      departmentId: currentDepartmentId,
      counterId: currentDepartmentId,
      accountId: paidFrom.type === 'account' ? paidFrom.id : null,
      remark: remark.trim() || null,
    } satisfies ExpenseMutationPayload;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildPayload();

    if (typeof payload === 'string') {
      setValidationError(payload);
      return;
    }

    setValidationError('');
    setPendingPayload(payload);
  };

  const confirmSubmit = async () => {
    if (!pendingPayload) return;
    const shouldReset = await onSubmit(pendingPayload);
    if (!initialValues && shouldReset !== false) resetForm();
    setPendingPayload(null);
  };

  return (
    <form onSubmit={handleSubmit} className="expense-entry-form" noValidate>
      {(validationError || submitError) ? (
        <div className="form-alert" role="alert">
          {validationError || submitError}
        </div>
      ) : null}

      <div className="form-section-card">
        <div className="form-section-title mb-3">Add Expense</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="expense-category">Expense Type *</label>
            <select
              id="expense-category"
              className="form-select"
              value={categoryId ? `id:${categoryId}` : category ? `name:${category}` : ''}
              onChange={(event) => {
                const value = event.target.value;
                if (value.startsWith('id:')) {
                  const nextCategoryId = value.slice(3);
                  const nextCategory = categories.find((entry) => entry.id === nextCategoryId);
                  setCategoryId(nextCategoryId);
                  setCategory(nextCategory?.name || '');
                } else {
                  setCategoryId('');
                  setCategory(value.startsWith('name:') ? value.slice(5) : '');
                }
                setValidationError('');
              }}
              required
            >
              <option value="">Select Expense Type</option>
              {categories.map((entry) => (
                <option key={entry.id} value={`id:${entry.id}`}>
                  {entry.name}
                </option>
              ))}
              {category && !categoryId ? (
                <option value={`name:${category}`}>{category}</option>
              ) : null}
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="expense-paid-from">Paid From *</label>
            <select
              id="expense-paid-from"
              className="form-select"
              value={paidFromValue}
              onChange={(event) => {
                setPaidFromValue(event.target.value as PaidFromValue);
                setValidationError('');
              }}
              required
            >
              <option value="">Select Paid From</option>
              {currentDepartment ? (
                <option value={`department:${currentDepartment.id}`}>
                  Department - {currentDepartment.name} 
                </option>
              ) : null}
              {activeAccounts.map((account) => (
                <option key={account.id} value={`account:${account.id}`}>
                  Account - {account.bankName}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="expense-amount">Amount *</label>
            <input
              id="expense-amount"
              className="form-control"
              min="1"
              placeholder="0"
              type="number"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>

          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="expense-remark">Remark</label>
            <textarea
              id="expense-remark"
              className="form-control styled-textarea"
              placeholder="Optional note"
              rows={3}
              value={remark || ''}
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="modal-actions">
        {onCancel ? (
          <button type="button" className="btn-app btn-app-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        ) : (
          <button type="button" className="btn-app btn-app-secondary" onClick={resetForm} disabled={isSubmitting}>
            Reset
          </button>
        )}
        <button type="submit" className="btn-app btn-app-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>

      {pendingPayload ? (
        <ConfirmActionModal
          title={initialValues ? 'Update Expense?' : 'Add Expense?'}
          description="Review the expense details before saving."
          confirmLabel={isSubmitting ? 'Saving...' : 'Confirm'}
          cancelLabel="Cancel"
          isConfirming={isSubmitting}
          onConfirm={confirmSubmit}
          onCancel={() => setPendingPayload(null)}
        >
          <div className="expense-confirm-summary">
            <div><span>Expense Type</span><strong>{pendingPayload.category}</strong></div>
            <div><span>Paid From</span><strong>{paidFromLabel}</strong></div>
            <div><span>Amount</span><strong>{formatMoney(pendingPayload.amount)}</strong></div>
          </div>
        </ConfirmActionModal>
      ) : null}
    </form>
  );
};

export default ExpenseEntryForm;
