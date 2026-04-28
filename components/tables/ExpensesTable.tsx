import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Expense } from '../../lib/store';
import DataTable from './DataTable';

interface ExpensesTableProps {
  expenses: Expense[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
}

const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={expenses}
      getRowKey={(expense) => expense.id}
      eyebrow="Expense"
      title="Expense ledger"
      copy="Keep categories, amount, status, and notes in one easy business ledger."
      emptyLabel="No expense records found."
      columns={[
        { key: 'serial', header: 'S.No', render: (_expense, index) => index + 1 },
        { key: 'expense', header: 'Expense', render: (expense) => <span className="data-table__primary">{expense.title}</span> },
        { key: 'category', header: 'Category', render: (expense) => expense.category },
        { key: 'amount', header: 'Amount', render: (expense) => `Rs. ${expense.amount.toLocaleString('en-IN')}` },
        {
          key: 'status',
          header: 'Status',
          render: (expense) => (
            <span className={`status-chip ${expense.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {expense.status}
            </span>
          ),
        },
        { key: 'date', header: 'Date', render: (expense) => expense.date },
        { key: 'notes', header: 'Notes', render: (expense) => <span className="data-table__secondary">{expense.notes || 'No notes'}</span> },
      ]}
      renderActions={(expense) => (
        <div className="table-actions">
          {onEdit ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(expense)}>
              <FaEdit size={12} />
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(expense.id)}>
              <FaTrashAlt size={12} />
              Delete
            </button>
          ) : null}
          {!hasActions ? <span className="page-muted small">View only</span> : null}
        </div>
      )}
    />
  );
};

export default ExpensesTable;
