import React from 'react';
import type { CashDepositRecord } from '../../lib/api/cashDeposits';
import { formatDateTime } from '../../src/utils/dateFormatter';
import RemarkCell from '../common/RemarkCell';
import DataTable, { type DataTablePagination } from './DataTable';

interface CashDepositsTableProps {
  deposits: CashDepositRecord[];
  isLoading?: boolean;
  error?: string;
  pagination?: DataTablePagination;
  headerAction?: React.ReactNode;
}

const formatMoney = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const CashDepositsTable: React.FC<CashDepositsTableProps> = ({
  deposits,
  isLoading = false,
  error = '',
  pagination,
  headerAction,
}) => (
  <DataTable
    rows={deposits}
    getRowKey={(deposit) => deposit.id}
    eyebrow="Accounts"
    title="Cash Deposit"
    copy="Deposit departmental cash into bank accounts."
    emptyLabel="No cash deposits found."
    isLoading={isLoading}
    error={error}
    pagination={pagination}
    headerAction={headerAction}
    columns={[
      { key: 'serial', header: 'S.No.', render: (_deposit, index) => index + 1 },
      { key: 'date', header: 'Date', render: (deposit) => formatDateTime(deposit.date, '-') },
      { key: 'department', header: 'Department', render: (deposit) => deposit.departmentName || '-' },
      { key: 'amount', header: 'Amount', render: (deposit) => formatMoney(deposit.amount) },
      { key: 'toBank', header: 'To Bank', render: (deposit) => deposit.toBank || '-' },
      { key: 'remark', header: 'Remark', render: (deposit) => <RemarkCell value={deposit.remark} /> },
      { key: 'user', header: 'User', render: (deposit) => deposit.userName || '-' },
    ]}
    renderActions={() => <span className="page-muted small">View only</span>}
  />
);

export default CashDepositsTable;
