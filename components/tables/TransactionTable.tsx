import React from 'react';
import { FaEdit, FaEye, FaFilter, FaTrashAlt } from 'react-icons/fa';
import type { Transaction } from '../../lib/store';
import DataTable from './DataTable';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onView?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
  headerAction?: React.ReactNode;
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
  headerAction,
}) => {
  const hasActions = Boolean(onEdit || onView || onDelete);

  return (
    <DataTable
      rows={transactions}
      getRowKey={(transaction) => transaction.id}
      eyebrow="Transactions"
      title="Recent activity"
      copy="Track service, amount, status, and timeline in one clean view."
      emptyLabel="No transaction records found."
      headerAction={headerAction || (onToggleFilters ? (
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
      ) : null)}
      columns={[
        {
          key: 'serial',
          header: 'S.No',
          render: (_transaction, index) => index + 1,
        },
        {
          key: 'transactionNumber',
          header: 'Txn No.',
          render: (transaction) => transaction.transactionNumber,
        },
        {
          key: 'customer',
          header: 'Customer',
          render: (transaction) => <span className="data-table__primary">{transaction.customerName}</span>,
        },
        {
          key: 'service',
          header: 'Service',
          render: (transaction) => transaction.service,
        },
        {
          key: 'payment',
          header: 'Payment',
          render: (transaction) => transaction.paymentMode.toUpperCase(),
        },
        {
          key: 'total',
          header: 'Total',
          render: (transaction) => `Rs. ${transaction.totalAmount.toLocaleString('en-IN')}`,
        },
        {
          key: 'paid',
          header: 'Paid',
          render: (transaction) => `Rs. ${transaction.paidAmount.toLocaleString('en-IN')}`,
        },
        {
          key: 'due',
          header: 'Due',
          render: (transaction) => `Rs. ${transaction.dueAmount.toLocaleString('en-IN')}`,
        },
        {
          key: 'department',
          header: 'Department',
          render: (transaction) => transaction.departmentName || 'Not assigned',
        },
        {
          key: 'handledBy',
          header: 'Handled By',
          render: (transaction) => transaction.handledByName || 'Not assigned',
        },
        {
          key: 'status',
          header: 'Status',
          render: (transaction) => (
            <span className={getStatusClass(transaction.status)}>{transaction.status}</span>
          ),
        },
        {
          key: 'date',
          header: 'Date',
          render: (transaction) => transaction.date,
        },
      ]}
      renderActions={(transaction) => (
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
      )}
    />
  );
};

export default TransactionTable;
