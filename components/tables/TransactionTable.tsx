import React from 'react';
import { FaEdit, FaEye, FaFilter, FaTrashAlt } from 'react-icons/fa';
import type { Transaction } from '../../lib/store';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onView?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
}

const getStatusClass = (status: Transaction['status']) => {
  if (status === 'completed') return 'status-chip status-chip--completed';
  if (status === 'pending') return 'status-chip status-chip--pending';
  if (status === 'refunded') return 'status-chip status-chip--info';
  return 'status-chip status-chip--failed';
};

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onView,
  onDelete,
  onToggleFilters,
  isFilterOpen = false,
}) => {
  const hasActions = Boolean(onEdit || onView || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Transactions</p>
          <h3 className="table-panel__title">Recent activity</h3>
          <p className="table-panel__copy">Track service, amount, status, and timeline in one clean view.</p>
        </div>
        {onToggleFilters ? (
          <button
            type="button"
            className="btn-app btn-app-secondary"
            onClick={onToggleFilters}
            aria-expanded={isFilterOpen}
            aria-controls="transaction-filter-panel"
          >
            <FaFilter />
            {isFilterOpen ? 'Hide Filters' : 'Filter'}
          </button>
        ) : null}
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Txn No.</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Department</th>
              <th>Handled By</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={13}>No transaction records found.</td>
              </tr>
            ) : (
              transactions.map((transaction, index) => (
                <tr key={transaction.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Txn No.">{transaction.transactionNumber}</td>
                  <td data-label="Customer">
                    <span className="data-table__primary">{transaction.customerName}</span>
                  </td>
                  <td data-label="Service">{transaction.service}</td>
                  <td data-label="Payment">{transaction.paymentMode.toUpperCase()}</td>
                  <td data-label="Total">Rs. {transaction.totalAmount.toLocaleString('en-IN')}</td>
                  <td data-label="Paid">Rs. {transaction.paidAmount.toLocaleString('en-IN')}</td>
                  <td data-label="Due">Rs. {transaction.dueAmount.toLocaleString('en-IN')}</td>
                  <td data-label="Department">{transaction.departmentName || 'Not assigned'}</td>
                  <td data-label="Handled By">{transaction.handledByName || 'Not assigned'}</td>
                  <td data-label="Status">
                    <span className={getStatusClass(transaction.status)}>{transaction.status}</span>
                  </td>
                  <td data-label="Date">{transaction.date}</td>
                  <td data-label="Actions">
                    <div className="table-actions">
                      {onView && (
                        <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onView(transaction)}>
                          <FaEye size={12} />
                          View
                        </button>
                      )}
                      {onEdit && (
                        <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(transaction)}>
                          <FaEdit size={12} />
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(transaction.id)}>
                          <FaTrashAlt size={12} />
                          Delete
                        </button>
                      )}
                      {!hasActions && <span className="page-muted small">View only</span>}
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

export default TransactionTable;
