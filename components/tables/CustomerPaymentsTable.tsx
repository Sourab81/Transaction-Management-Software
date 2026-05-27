import React from 'react';
import { FaMoneyBillWave } from 'react-icons/fa';
import type { CustomerBalance } from '../../lib/api/customerBalance';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../lib/customer-balance-format';
import DataTable from './DataTable';

interface CustomerPaymentsTableProps {
  balances: CustomerBalance[];
  onPay?: (balance: CustomerBalance) => void;
  isLoading?: boolean;
}

const CustomerPaymentsTable: React.FC<CustomerPaymentsTableProps> = ({
  balances,
  onPay,
  isLoading = false,
}) => (
  <DataTable
    rows={balances}
    getRowKey={(balance) => String(balance.id)}
    eyebrow="Customer Payments"
    title="Customer payment list"
    copy="Track customer balances and collect pending payments by cash or account."
    emptyLabel="No customer balance records found."
    isLoading={isLoading}
    columns={[
      { key: 'serial', header: 'S.No', render: (_balance, index) => index + 1 },
      { key: 'customerName', header: 'Customer Name', render: (balance) => <span className="data-table__primary">{balance.customerName || `Customer #${balance.customerId}`}</span> },
      { key: 'phoneNo', header: 'Phone No', render: (balance) => balance.phoneNo || '-' },
      { key: 'lastTransaction', header: 'Last Transaction', render: (balance) => balance.lastTransaction || '-' },
      {
        key: 'currentBalanceStatus',
        header: 'Current Balance Status',
        render: (balance) => (
          <span className={getCustomerBalanceClassName(balance.currentBalanceStatus)}>
            {formatCustomerBalance(balance.currentBalanceStatus)}
          </span>
        ),
      },
      { key: 'status', header: 'Status', render: (balance) => <span className="status-chip status-chip--active">{String(balance.status)}</span> },
    ]}
    renderActions={(balance) => (
      onPay ? (
        <div className="table-actions">
          <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onPay(balance)}>
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

export default CustomerPaymentsTable;
