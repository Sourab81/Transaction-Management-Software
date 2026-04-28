import React from 'react';
import { FaEye } from 'react-icons/fa';
import type { Transaction } from '../../lib/store';
import DataTable from './DataTable';

interface CustomerPaymentsTableProps {
  transactions: Transaction[];
  onView?: (transaction: Transaction) => void;
}

const getStatusClass = (status: Transaction['status']) => {
  if (status === 'completed') return 'status-chip status-chip--completed';
  if (status === 'pending') return 'status-chip status-chip--pending';
  if (status === 'refunded') return 'status-chip status-chip--info';
  return 'status-chip status-chip--failed';
};

const CustomerPaymentsTable: React.FC<CustomerPaymentsTableProps> = ({ transactions, onView }) => {
  const hasActions = Boolean(onView);

  return (
    <DataTable
      rows={transactions}
      getRowKey={(transaction) => transaction.id}
      eyebrow="Customer Payments"
      title="Customer payment list"
      copy="Track customer payment activity, service name, amount, and payment status in one place."
      emptyLabel="No customer payment records found."
      columns={[
        { key: 'serial', header: 'S.No', render: (_transaction, index) => index + 1 },
        { key: 'transactionNumber', header: 'Txn No.', render: (transaction) => transaction.transactionNumber },
        { key: 'customer', header: 'Customer', render: (transaction) => <span className="data-table__primary">{transaction.customerName}</span> },
        { key: 'service', header: 'Service', render: (transaction) => transaction.service },
        { key: 'paymentMode', header: 'Payment Mode', render: (transaction) => transaction.paymentMode.toUpperCase() },
        { key: 'total', header: 'Total', render: (transaction) => `Rs. ${transaction.totalAmount.toLocaleString('en-IN')}` },
        { key: 'paid', header: 'Paid', render: (transaction) => `Rs. ${transaction.paidAmount.toLocaleString('en-IN')}` },
        { key: 'due', header: 'Due', render: (transaction) => `Rs. ${transaction.dueAmount.toLocaleString('en-IN')}` },
        { key: 'status', header: 'Status', render: (transaction) => <span className={getStatusClass(transaction.status)}>{transaction.status}</span> },
        { key: 'date', header: 'Date', render: (transaction) => transaction.date },
      ]}
      renderActions={(transaction) => (
        hasActions ? (
          <div className="table-actions">
            {onView ? (
              <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onView(transaction)}>
                <FaEye size={12} />
                View
              </button>
            ) : null}
          </div>
        ) : (
          <span className="page-muted small">View only</span>
        )
      )}
    />
  );
};

export default CustomerPaymentsTable;
