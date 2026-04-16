import React from 'react';
import { FaEye } from 'react-icons/fa';

export interface CustomerOutstandingRow {
  customerId: string;
  customerName: string;
  phone: string;
  outstandingAmount: number;
  pendingPayments: number;
  lastPendingDate: string;
}

interface CustomerOutstandingTableProps {
  rows: CustomerOutstandingRow[];
  onView?: (customerId: string) => void;
}

const CustomerOutstandingTable: React.FC<CustomerOutstandingTableProps> = ({ rows, onView }) => {
  const hasActions = Boolean(onView);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Outstanding</p>
          <h3 className="table-panel__title">Customer outstanding list</h3>
          <p className="table-panel__copy">See which customers still have pending payments and how much is outstanding.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Pending Payments</th>
              <th>Outstanding Amount</th>
              <th>Last Pending Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={7}>No outstanding customer payments found.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.customerId}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Customer">
                    <span className="data-table__primary">{row.customerName}</span>
                  </td>
                  <td data-label="Phone">{row.phone || 'Not added'}</td>
                  <td data-label="Pending Payments">{row.pendingPayments}</td>
                  <td data-label="Outstanding Amount">Rs. {row.outstandingAmount.toLocaleString('en-IN')}</td>
                  <td data-label="Last Pending Date">{row.lastPendingDate}</td>
                  <td data-label="Actions">
                    {hasActions ? (
                      <div className="table-actions">
                        {onView ? (
                          <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onView(row.customerId)}>
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

export default CustomerOutstandingTable;
