import React from 'react';
import { FaEye } from 'react-icons/fa';
import DataTable from './DataTable';

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
    <DataTable
      rows={rows}
      getRowKey={(row) => row.customerId}
      eyebrow="Outstanding"
      title="Customer outstanding list"
      copy="See which customers still have pending payments and how much is outstanding."
      emptyLabel="No outstanding customer payments found."
      columns={[
        { key: 'serial', header: 'S.No', render: (_row, index) => index + 1 },
        { key: 'customer', header: 'Customer', render: (row) => <span className="data-table__primary">{row.customerName}</span> },
        { key: 'phone', header: 'Phone', render: (row) => row.phone || 'Not added' },
        { key: 'pending', header: 'Pending Payments', render: (row) => row.pendingPayments },
        { key: 'outstanding', header: 'Outstanding Amount', render: (row) => `Rs. ${row.outstandingAmount.toLocaleString('en-IN')}` },
        { key: 'lastPending', header: 'Last Pending Date', render: (row) => row.lastPendingDate },
      ]}
      renderActions={(row) => (
        hasActions ? (
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
        )
      )}
    />
  );
};

export default CustomerOutstandingTable;
