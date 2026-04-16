import React from 'react';
import { FaEye } from 'react-icons/fa';
import type { Transaction } from '../../lib/store';

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
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Customer Payments</p>
          <h3 className="table-panel__title">Customer payment list</h3>
          <p className="table-panel__copy">Track customer payment activity, service name, amount, and payment status in one place.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Txn No.</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Payment Mode</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={11}>No customer payment records found.</td>
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
                  <td data-label="Payment Mode">{transaction.paymentMode.toUpperCase()}</td>
                  <td data-label="Total">Rs. {transaction.totalAmount.toLocaleString('en-IN')}</td>
                  <td data-label="Paid">Rs. {transaction.paidAmount.toLocaleString('en-IN')}</td>
                  <td data-label="Due">Rs. {transaction.dueAmount.toLocaleString('en-IN')}</td>
                  <td data-label="Status">
                    <span className={getStatusClass(transaction.status)}>
                      {transaction.status}
                    </span>
                  </td>
                  <td data-label="Date">{transaction.date}</td>
                  <td data-label="Actions">
                    {hasActions ? (
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
                    )}
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

export default CustomerPaymentsTable;
