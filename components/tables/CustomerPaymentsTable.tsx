import React from 'react';
import type { CustomerBalance } from '../../lib/api/customerBalance';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../lib/customer-balance-format';
import { formatDateTime } from '../../src/utils/dateFormatter';
import RemarkCell from '../common/RemarkCell';
import DataTable from './DataTable';

interface CustomerPaymentsTableProps {
  rows: CustomerBalance[];
  isLoading?: boolean;
}

const formatLedgerAmount = (value: number | undefined) => {
  const amount = Number(value ?? 0);
  return amount === 0 ? '-' : amount.toLocaleString('en-IN');
};

const getLedgerBalance = (row: CustomerBalance) => row.balance ?? Number(formatCustomerBalance(row.currentBalanceStatus));
const formatPaymentRemark = (row: CustomerBalance) => {
  const base = `CustomerPaymentToBank/${row.customerName || row.customerId || 'Customer'}`.replace(/\/+$/, '');
  const remark = (row.remark || '').trim().replace(/\/+$/, '');

  if (!remark) return base;
  if (remark.startsWith(base) || remark.startsWith('CustomerPaymentToBank/')) return remark;

  return `${base}/${remark}`;
};

const CustomerPaymentsTable: React.FC<CustomerPaymentsTableProps> = ({
  rows,
  isLoading = false,
}) => (
  <DataTable
    rows={rows}
    getRowKey={(row) => String(row.id)}
    eyebrow="Customer Payments"
    title=""
    emptyLabel="No customer ledger records found."
    isLoading={isLoading}
    className="customer-ledger-panel"
    tableClassName="customer-ledger-table"
    columns={[
      { key: 'serial', header: 'S.No', render: (_row, index) => index + 1 },
      { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date || row.lastTransaction) },
      { key: 'counterBank', header: 'Counter / Bank', render: (row) => row.counterOrBank || '-' },
      { key: 'debit', header: 'Debit', render: (row) => formatLedgerAmount(row.debit) },
      { key: 'credit', header: 'Credit', render: (row) => formatLedgerAmount(row.credit) },
      {
        key: 'balance',
        header: 'Balance',
        render: (row) => (
          <span className={getCustomerBalanceClassName(getLedgerBalance(row))}>
            {formatCustomerBalance(getLedgerBalance(row))}
          </span>
        ),
      },
      { key: 'remark', header: 'Remark', render: (row) => <RemarkCell value={formatPaymentRemark(row)} /> },
      { key: 'addedBy', header: 'Added By', render: (row) => row.addedByName || '-' },
    ]}
  />
);

export default CustomerPaymentsTable;
