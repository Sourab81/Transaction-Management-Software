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
  isLoading?: boolean;
}

const formatCurrency = (value: number | undefined) => (
  `Rs. ${(value ?? 0).toLocaleString('en-IN')}`
);

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onView,
  onDelete,
  onToggleFilters,
  isFilterOpen = false,
  headerAction,
  isLoading = false,
}) => {
  const hasActions = Boolean(onEdit || onView || onDelete);

  return (
    <DataTable
      rows={transactions}
      getRowKey={(transaction) => transaction.id}
      eyebrow="Transactions"
      title="Recent activity"
      copy="Track form, service or product, account, charges, and totals in one clean view."
      emptyLabel="No transaction records found."
      isLoading={isLoading}
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
          key: 'formName',
          header: 'Form Name',
          render: (transaction) => transaction.formName || 'Not added',
        },
        {
          key: 'transactionNo',
          header: 'Txn No.',
          render: (transaction) => transaction.transactionNo || transaction.transactionNumber,
        },
        {
          key: 'serviceProduct',
          header: 'Service/Product',
          render: (transaction) => (
            <span className="data-table__primary">{transaction.serviceProduct || transaction.service}</span>
          ),
        },
        {
          key: 'transactionAccount',
          header: 'Transaction Account',
          render: (transaction) => transaction.accountLabel || transaction.transactionAccountId || 'Not linked',
        },
        {
          key: 'amount',
          header: 'Amount',
          render: (transaction) => formatCurrency(transaction.amount ?? transaction.totalAmount),
        },
        {
          key: 'serviceCharge',
          header: 'Service Charge',
          render: (transaction) => formatCurrency(transaction.serviceCharge),
        },
        {
          key: 'bankCharge',
          header: 'Bank Charge',
          render: (transaction) => formatCurrency(transaction.bankCharge),
        },
        {
          key: 'otherCharge',
          header: 'Other Charge',
          render: (transaction) => formatCurrency(transaction.otherCharge),
        },
        {
          key: 'totalAmount',
          header: 'Total Amount',
          render: (transaction) => formatCurrency(transaction.totalAmount),
        },
        {
          key: 'remark',
          header: 'Remark',
          render: (transaction) => transaction.remark || transaction.note || 'No remark',
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
