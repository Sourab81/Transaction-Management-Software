import React from 'react';
import type { BalanceUpdateMode, BalanceUpdateRecord } from '../../lib/api/balanceUpdates';
import { formatDateTime } from '../../src/utils/dateFormatter';
import RemarkCell from '../common/RemarkCell';
import DataTable, { type DataTablePagination } from './DataTable';

interface BalanceUpdatesTableProps {
  updates: BalanceUpdateRecord[];
  mode: BalanceUpdateMode;
  isLoading?: boolean;
  error?: string;
  pagination?: DataTablePagination;
  headerAction?: React.ReactNode;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const BalanceUpdatesTable: React.FC<BalanceUpdatesTableProps> = ({
  updates,
  mode,
  isLoading = false,
  error = '',
  pagination,
  headerAction,
}) => {
  const sourceHeader = mode === 'department' ? 'Counter' : 'Account';

  return (
    <DataTable
      rows={updates}
      getRowKey={(update) => update.id}
      title="Balance Update"
      copy={mode === 'department' ? 'Compare departmental balances with statements.' : 'Compare account balances with statements.'}
      emptyLabel="No balance updates found."
      isLoading={isLoading}
      error={error}
      pagination={pagination}
      headerAction={headerAction}
      columns={[
        { key: 'serial', header: 'S.No', render: (_update, index) => index + 1 },
        { key: 'date', header: 'Date', render: (update) => formatDateTime(update.date, '-') },
        { key: 'valueDate', header: 'Value Date', render: (update) => update.valueDate || '-' },
        { key: 'source', header: sourceHeader, render: (update) => update.departmentName || update.accountName || '-' },
        { key: 'existingBalance', header: 'Existing Balance', render: (update) => formatMoney(update.existingBalance) },
        { key: 'statementBalance', header: 'Balance as per Statement', render: (update) => formatMoney(update.statementBalance) },
        {
          key: 'difference',
          header: 'Difference',
          render: (update) => {
            const diff = update.difference;
            const cls = diff < 0 ? 'text-danger' : diff > 0 ? 'text-success' : '';
            return <span className={cls}>{formatMoney(diff)}</span>;
          },
        },
        { key: 'remark', header: 'Remark', render: (update) => <RemarkCell value={update.remark} /> },
        { key: 'user', header: 'Updated By', render: (update) => update.userName || '-' },
      ]}
    />
  );
};

export default BalanceUpdatesTable;
