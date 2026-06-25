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

const getTodayDate = () => new Date().toLocaleDateString('en-CA');
const formatMoney = (amount: number | undefined) => `₹${(amount ?? 0).toLocaleString('en-IN')}`;

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
  const initialSourceType: ExpensePaymentMode = initialValues?.paymentMode || 'department';
  const initialCategoryId = initialValues?.categoryId || '';
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [category, setCategory] = useState(initialValues?.category || '');
  const [sourceType, setSourceType] = useState<ExpensePaymentMode>(initialSourceType);
  const [sourceId, setSourceId] = useState(
    initialSourceType === 'account'
      ? initialValues?.accountId || ''
      : initialValues?.counterId || defaultDepartmentId,
  );
  const [amount, setAmount] = useState(initialValues ? String(initialValues.amount) : '');
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [expenseDate, setExpenseDate] = useState(initialValues?.date ? initialValues.date.slice(0, 10) : getTodayDate());
  const [validationError, setValidationError] = useState('');
  const [pendingPayload, setPendingPayload] = useState<ExpenseMutationPayload | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((entry) => entry.id === categoryId) || null,
    [categoryId, categories],
  );
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === sourceId) || null,
    [sourceId, accounts],
  );
  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === sourceId) || null,
    [sourceId, departments],
  );
  const balanceSource = sourceType === 'account' ? selectedAccount : selectedDepartment;
  const sourceLabel = sourceType === 'account'
    ? selectedAccount
      ? `${selectedAccount.bankName} Account`
      : 'Account'
    : selectedDepartment
      ? selectedDepartment.name
      : 'Department';

  const resetForm = () => {
    setCategoryId('');
    setCategory('');
    setSourceType('department');
    setSourceId(defaultDepartmentId);
    setAmount('');
    setRemark('');
    setExpenseDate(getTodayDate());
    setValidationError('');
    setPendingPayload(null);
  };

  const handleSourceTypeChange = (nextSourceType: ExpensePaymentMode) => {
    setSourceType(nextSourceType);
    setSourceId(nextSourceType === 'department' ? defaultDepartmentId : '');
    setValidationError('');
  };

  const buildPayload = () => {
    const parsedAmount = parseNonNegativeNumber(amount);
    const resolvedCategory = selectedCategory?.name || category.trim();

    if (!resolvedCategory) {
      return 'Expense Type is required.';
    }
    if (sourceType !== 'account' && sourceType !== 'department') {
      return 'Source Type is required.';
    }
    if (!sourceId) {
      return sourceType === 'account' ? 'Account is required.' : 'Department is required.';
    }
    if (parsedAmount === null || parsedAmount <= 0) {
      return 'Amount must be greater than 0.';
    }
    if (!expenseDate) {
      return 'Expense date is required.';
    }

    const counterId = sourceType === 'department'
      ? sourceId
      : defaultDepartmentId || departments[0]?.id || '';

    if (!counterId) {
      return 'Department is required.';
    }

    return {
      ...(initialValues ? { id: initialValues.id } : {}),
      title: resolvedCategory,
      categoryId: categoryId || undefined,
      category: resolvedCategory,
      amount: parsedAmount,
      paymentMode: sourceType,
      accountId: sourceType === 'account' ? sourceId : null,
      counterId,
      remark: remark.trim() || null,
      date: expenseDate,
      expenseDate,
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
            <label className="form-label">Source Type *</label>
            <div className="expense-source-toggle">
              <label>
                <input
                  type="radio"
                  name="expense-source-type"
                  checked={sourceType === 'account'}
                  onChange={() => handleSourceTypeChange('account')}
                />
                Account
              </label>
              <label>
                <input
                  type="radio"
                  name="expense-source-type"
                  checked={sourceType === 'department'}
                  onChange={() => handleSourceTypeChange('department')}
                />
                Department
              </label>
            </div>
          </div>

          <div className="col-12 col-md-6">
            {sourceType === 'account' ? (
              <>
                <label className="form-label" htmlFor="expense-account">Account *</label>
                <select
                  id="expense-account"
                  className="form-select"
                  value={sourceId}
                  onChange={(event) => {
                    setSourceId(event.target.value);
                    setValidationError('');
                  }}
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} ({formatMoney(account.currentBalance)})
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="form-label" htmlFor="expense-department">Department *</label>
                <select
                  id="expense-department"
                  className="form-select"
                  value={sourceId}
                  onChange={(event) => {
                    setSourceId(event.target.value);
                    setValidationError('');
                  }}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({formatMoney(department.currentBalance)})
                    </option>
                  ))}
                </select>
              </>
            )}
            <p className="expense-balance-hint">
              Available Balance:
              <strong>{formatMoney(typeof balanceSource?.currentBalance === 'number' ? balanceSource.currentBalance : 0)}</strong>
            </p>
          </div>

          <div className="col-12 col-md-3">
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

          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="expense-date">Expense Date *</label>
            <input
              id="expense-date"
              className="form-control"
              type="date"
              value={expenseDate}
              onChange={(event) => {
                setExpenseDate(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>

          <div className="col-12">
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
            <div><span>Source</span><strong>{sourceLabel}</strong></div>
            <div><span>Amount</span><strong>{formatMoney(pendingPayload.amount)}</strong></div>
          </div>
        </ConfirmActionModal>
      ) : null}
    </form>
  );
};

export default ExpenseEntryForm;
