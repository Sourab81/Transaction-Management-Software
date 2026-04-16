import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Expense } from '../../lib/store';

interface ExpensesTableProps {
  expenses: Expense[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
}

const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Expense</p>
          <h3 className="table-panel__title">Expense ledger</h3>
          <p className="table-panel__copy">Keep categories, amount, status, and notes in one easy business ledger.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Expense</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={8}>No expense records found.</td>
              </tr>
            ) : (
              expenses.map((expense, index) => (
                <tr key={expense.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Expense"><span className="data-table__primary">{expense.title}</span></td>
                  <td data-label="Category">{expense.category}</td>
                  <td data-label="Amount">Rs. {expense.amount.toLocaleString('en-IN')}</td>
                  <td data-label="Status">
                    <span className={`status-chip ${expense.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td data-label="Date">{expense.date}</td>
                  <td data-label="Notes"><span className="data-table__secondary">{expense.notes || 'No notes'}</span></td>
                  <td data-label="Actions">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ExpensesTable;
