import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { ExpenseRecord } from '../../lib/api/expenses';
import { formatDateTime } from '../../src/utils/dateFormatter';
import DataTable from './DataTable';
import type { DataTablePagination } from './DataTable';

interface ExpensesTableProps {
  expenses: ExpenseRecord[];
  isLoading?: boolean;
  error?: string;
  onEdit?: (expense: ExpenseRecord) => void;
  onDelete?: (expenseId: string) => void;
  pagination?: DataTablePagination;
}

const formatMoney = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const getPaidFrom = (expense: ExpenseRecord) => (
  expense.paymentMode === 'account'
    ? expense.accountName || expense.bankName || expense.accountId || '-'
    : expense.counterName || 'Department'
);

const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, isLoading = false, error = '', onEdit, onDelete, pagination }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={expenses}
      getRowKey={(expense) => expense.id}
      eyebrow="Expenses"
      title="Expense List"
      copy="Expense history with category, department, payment source, and balance impact."
      emptyLabel="No expense records found."
      isLoading={isLoading}
      pagination={pagination}
      columns={[
        { key: 'date', header: 'Expense Date', render: (expense) => formatDateTime(expense.date) },
        { key: 'category', header: 'Expense Type', render: (expense) => expense.category || expense.title || '-' },
        { key: 'amount', header: 'Amount', render: (expense) => formatMoney(expense.amount) },
        { key: 'paidFrom', header: 'Paid From', render: getPaidFrom },
        { key: 'department', header: 'Department', render: (expense) => expense.counterName || expense.counterId || '-' },
        {
          key: 'account',
          header: 'Account',
          render: (expense) => expense.paymentMode === 'account'
            ? expense.accountName || expense.bankName || expense.accountId || '-'
            : '-',
        },
        { key: 'remark', header: 'Remark', render: (expense) => expense.remark || '-' },
        { key: 'addedBy', header: 'Added By', render: (expense) => expense.addedByName || '-' },
      ]}
      className="expense-list-table"
      wrapperClassName="expense-list-table__wrapper"
      tableClassName="expense-list-table__table"
      renderActions={(expense) => (
        <div className="table-actions">
          {onEdit ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(expense)} aria-label="Edit expense" title="Edit expense">
              <FaEdit size={12} />
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(expense.id)} aria-label="Delete expense" title="Delete expense">
              <FaTrashAlt size={12} />
            </button>
          ) : null}
          {!hasActions ? <span className="page-muted small">View only</span> : null}
        </div>
      )}
      error={error}
    />
  );
};

export default ExpensesTable;
