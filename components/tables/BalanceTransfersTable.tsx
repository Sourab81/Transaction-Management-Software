import React from 'react';
import type { BalanceTransferMode, BalanceTransferRecord } from '../../lib/api/balanceTransfers';
import { formatDateTime } from '../../src/utils/dateFormatter';
import RemarkCell from '../common/RemarkCell';
import DataTable, { type DataTablePagination } from './DataTable';

interface BalanceTransfersTableProps {
  transfers: BalanceTransferRecord[];
  mode: BalanceTransferMode;
  isLoading?: boolean;
  error?: string;
  pagination?: DataTablePagination;
  headerAction?: React.ReactNode;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const BalanceTransfersTable: React.FC<BalanceTransfersTableProps> = ({
  transfers,
  mode,
  isLoading = false,
  error = '',
  pagination,
  headerAction,
}) => {
  const fromHeader = mode === 'department' ? 'From Department' : 'From Account';
  const toHeader = mode === 'department' ? 'To Department' : 'To Account';

  return (
    <DataTable
      rows={transfers}
      getRowKey={(transfer) => transfer.id}
      title="Balance Transfer"
      copy={mode === 'department' ? 'Transfer balances between departments.' : 'Transfer balances between accounts.'}
      emptyLabel="No balance transfers found."
      isLoading={isLoading}
      error={error}
      pagination={pagination}
      headerAction={headerAction}
      columns={[
        { key: 'serial', header: 'S.No', render: (_transfer, index) => index + 1 },
        { key: 'date', header: 'Date', render: (transfer) => formatDateTime(transfer.date, '-') },
        { key: 'from', header: fromHeader, render: (transfer) => transfer.fromName || '-' },
        { key: 'amount', header: 'Amount', render: (transfer) => formatMoney(transfer.amount) },
        { key: 'to', header: toHeader, render: (transfer) => transfer.toName || '-' },
        { key: 'remark', header: 'Remark', render: (transfer) => <RemarkCell value={transfer.remark} /> },
        { key: 'user', header: 'User', render: (transfer) => transfer.userName || '-' },
      ]}
    />
  );
};

export default BalanceTransfersTable;
