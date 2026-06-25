import React, { useEffect } from 'react';
import { FaMoneyBillWave } from 'react-icons/fa';
import type { CustomerBalance } from '../../lib/api/customerBalance';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../lib/customer-balance-format';
import DataTable from './DataTable';

interface CustomerOutstandingTableProps {
  rows: CustomerBalance[];
  onPay?: (balance: CustomerBalance) => void;
  isLoading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
  } | null;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

const renderSignedBalance = (balance: unknown) => {
  const numericBalance = Number(formatCustomerBalance(balance));

  if (!Number.isFinite(numericBalance) || numericBalance === 0) {
    return <span>{formatCustomerBalance(balance)}</span>;
  }

  return (
    <span className={getCustomerBalanceClassName(numericBalance)}>
      {numericBalance > 0 ? `+${formatCustomerBalance(numericBalance)}` : formatCustomerBalance(numericBalance)}
    </span>
  );
};

const CustomerOutstandingTable: React.FC<CustomerOutstandingTableProps> = ({
  rows,
  onPay,
  isLoading = false,
  pagination,
  onPageChange,
  onLimitChange,
}) => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Customers Outstanding][Table] Rows received:', rows);
    }
  }, [rows]);

  return (
    <DataTable
      rows={rows}
      getRowKey={(row) => String(row.id)}
      eyebrow="Outstanding"
      title="Customers Outstanding"
      copy="Customer balance records with due, advance, or clear status."
      emptyLabel="No customer outstanding records found."
      isLoading={isLoading}
      columns={[
        {
          key: 'serial',
          header: 'S.No',
          render: (_row, index) => pagination
            ? ((pagination.currentPage - 1) * pagination.limit) + index + 1
            : index + 1,
        },
        { key: 'customerCode', header: 'Customer Code', render: (row) => row.customerCode || row.customerId || '-' },
        { key: 'customerName', header: 'Customer Name', render: (row) => <span className="data-table__primary">{row.customerName || '-'}</span> },
        { key: 'phone', header: 'Phone', render: (row) => row.phoneNo || '-' },
        {
          key: 'currentBalance',
          header: 'Current Balance',
          render: (row) => renderSignedBalance(row.currentBalanceStatus),
        },
        {
          key: 'todayBalance',
          header: "Today's Balance",
          render: (row) => {
            const todayBalance = row.todayBalance ?? 0;
            const todayBalanceStatus = row.todayBalanceStatus || 'clear';
            const normalizedTodayBalanceStatus = todayBalanceStatus.toLowerCase();
            const signedTodayBalance = normalizedTodayBalanceStatus === 'due'
              ? -Math.abs(todayBalance)
              : normalizedTodayBalanceStatus === 'advance'
                ? Math.abs(todayBalance)
                : todayBalance;

            return renderSignedBalance(todayBalance === 0 ? 0 : signedTodayBalance);
          },
        },
      ]}
      pagination={pagination ? {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalRecords: pagination.totalRecords,
        limit: pagination.limit,
        isLoading,
        onPageChange: onPageChange ?? (() => {}),
        onLimitChange,
      } : undefined}
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
};

export default CustomerOutstandingTable;
