import React from 'react';
import { FaEdit, FaLink, FaTrashAlt } from 'react-icons/fa';
import { getDepartmentLinkedAccountIds, type Account, type Counter } from '../../lib/store';
import DataTable from './DataTable';

interface AccountsTableProps {
  accounts: Account[];
  departments?: Counter[];
  isLoading?: boolean;
  onEdit?: (account: Account) => void;
  onLink?: (account: Account) => void;
  onDelete?: (accountId: string) => void;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const AccountsTable: React.FC<AccountsTableProps> = ({ accounts, departments = [], isLoading = false, onEdit, onLink, onDelete }) => {
  const hasActions = Boolean(onEdit || onLink || onDelete);
  const getLinkedDepartmentName = (account: Account) =>
    departments.find((department) =>
      department.id === account.counterId || getDepartmentLinkedAccountIds(department).includes(account.id)
    )?.name || 'Not linked';

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
        { key: 'serial', header: 'S.No', render: (_account, index) => index + 1 },
        { key: 'holder', header: 'Account Holder', render: (account) => <span className="data-table__primary">{account.accountHolder}</span> },
        { key: 'bank', header: 'Bank', render: (account) => account.bankName },
        { key: 'accountNumber', header: 'Account No.', render: (account) => account.accountNumber },
        { key: 'ifsc', header: 'IFSC', render: (account) => account.ifsc },
        { key: 'branch', header: 'Branch', render: (account) => account.branch || '-' },
        { key: 'department', header: 'Department', render: getLinkedDepartmentName },
        { key: 'opening', header: 'Opening', render: (account) => formatMoney(account.openingBalance) },
        { key: 'current', header: 'Current', render: (account) => formatMoney(account.currentBalance) },
        {
          key: 'status',
          header: 'Status',
          render: (account) => (
            <span className={`status-chip ${account.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {account.status}
            </span>
          ),
        },
        { key: 'date', header: 'Date', render: (account) => account.date },
        { key: 'remark', header: 'Remark', render: (account) => account.remark || '-' },
      ]}
      renderActions={(account) => (
        <div className="table-actions">
          {onEdit && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(account)}>
              <FaEdit size={12} />
              Edit
            </button>
          )}
          {onLink && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onLink(account)}>
              <FaLink size={12} />
              Link
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
