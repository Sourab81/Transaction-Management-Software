import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Account } from '../../lib/store';
import { formatDateTime } from '../../src/utils/dateFormatter';
import RemarkCell from '../common/RemarkCell';
import DataTable from './DataTable';

interface AccountsTableProps {
  accounts: Account[];
  isLoading?: boolean;
  onEdit?: (account: Account) => void;
  onDelete?: (accountId: string) => void;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const AccountsTable: React.FC<AccountsTableProps> = ({ accounts, isLoading = false, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={accounts}
      getRowKey={(account) => account.id}
      eyebrow="Accounts"
      title="Payment accounts"
      copy="Bank details, balances, and account status from a single list."
      emptyLabel="No account records found."
      isLoading={isLoading}
      columns={[
        { key: 'holder', header: 'Account Holder', render: (account) => <span className="data-table__primary">{account.accountHolder}</span> },
        { key: 'bank', header: 'Bank', render: (account) => account.bankName },
        { key: 'accountNumber', header: 'Account No.', render: (account) => account.accountNumber },
        { key: 'ifsc', header: 'IFSC Code', render: (account) => account.ifsc },
        { key: 'branch', header: 'Branch', render: (account) => account.branch || '-' },
        { key: 'opening', header: 'Opening Balance', render: (account) => formatMoney(account.openingBalance) },
        { key: 'current', header: 'Current Balance', render: (account) => formatMoney(account.currentBalance) },
        { key: 'remark', header: 'Remark', render: (account) => <RemarkCell value={account.remark} /> },
        { key: 'addedBy', header: 'Added By', render: (account) => account.addedByName || '-' },
        {
          key: 'status',
          header: 'Status',
          render: (account) => (
            <span className={`status-chip ${account.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {account.status}
            </span>
          ),
        },
        { key: 'date', header: 'Added Date', render: (account) => formatDateTime(account.addedDate || account.date) },
      ]}
      renderActions={(account) => (
        <div className="table-actions">
          {onEdit && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(account)}>
              <FaEdit size={12} />
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(account.id)}>
              <FaTrashAlt size={12} />
              Delete
            </button>
          )}
          {!hasActions && <span className="page-muted small">View only</span>}
        </div>
      )}
    />
  );
};

export default AccountsTable;
