import React from 'react';
import { FaMoneyBillWave } from 'react-icons/fa';
import type { CustomerBalance } from '../../lib/api/customerBalance';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../lib/customer-balance-format';
import DataTable from './DataTable';

interface CustomerOutstandingTableProps {
  rows: CustomerBalance[];
  onPay?: (balance: CustomerBalance) => void;
  isLoading?: boolean;
}

const formatCustomerStatus = (balance: CustomerBalance) => {
  const currentBalance = Number(formatCustomerBalance(balance.currentBalanceStatus));
  if (currentBalance < 0) return 'Due';
  if (currentBalance > 0) return 'Advance';
  return 'Clear';
};

const CustomerOutstandingTable: React.FC<CustomerOutstandingTableProps> = ({
  rows,
  onPay,
  isLoading = false,
}) => (
  <DataTable
    rows={rows}
    getRowKey={(row) => String(row.id)}
    eyebrow="Outstanding"
    title="Customers Outstanding"
    copy="Customer balance records with due, advance, or clear status."
    emptyLabel="No customer outstanding records found."
    isLoading={isLoading}
    columns={[
      { key: 'customerId', header: 'Customer ID', render: (row) => row.customerCode || row.customerId || '-' },
      { key: 'customerName', header: 'Customer Name', render: (row) => <span className="data-table__primary">{row.customerName || '-'}</span> },
      { key: 'phone', header: 'Phone', render: (row) => row.phoneNo || '-' },
      { key: 'lastTransaction', header: 'Last Transaction', render: (row) => row.lastTransaction || '-' },
      {
        key: 'currentBalance',
        header: 'Current Balance',
        render: (row) => (
          <span className={getCustomerBalanceClassName(row.currentBalanceStatus)}>
            {formatCustomerBalance(row.currentBalanceStatus)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const status = formatCustomerStatus(row);
          const className = status === 'Due'
            ? 'status-chip status-chip--pending'
            : status === 'Advance'
              ? 'status-chip status-chip--info'
              : 'status-chip status-chip--active';

          return <span className={className}>{status}</span>;
        },
      },
    ]}
    renderActions={(row) => (
      onPay ? (
        <div className="table-actions">
          <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onPay(row)}>
            <FaMoneyBillWave size={12} />
            Pay
          </button>
        </div>
      ) : (
        <span className="page-muted small">View only</span>
      )
    )}
  />
);

export default CustomerOutstandingTable;
