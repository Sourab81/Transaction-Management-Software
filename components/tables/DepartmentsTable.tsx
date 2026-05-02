import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import {
  getDepartmentDefaultAccount,
  getDepartmentLinkedAccounts,
  type Account,
  type Counter,
} from '../../lib/store';
import DataTable from './DataTable';

interface DepartmentsTableProps {
  accounts: Account[];
  counters: Counter[];
  onEdit?: (counter: Counter) => void;
  onDelete?: (counterId: string) => void;
  isLoading?: boolean;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const DepartmentsTable: React.FC<DepartmentsTableProps> = ({
  accounts,
  counters,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={counters}
      getRowKey={(counter) => counter.id}
      eyebrow="Departments"
      title="Department and counter records"
      copy="Track department codes, default posting accounts, linked account counts, balances, and status from one searchable table."
      emptyLabel="No department records found."
      isLoading={isLoading}
      columns={[
        { key: 'serial', header: 'S.No', render: (_counter, index) => index + 1 },
        {
          key: 'department',
          header: 'Department',
          render: (counter) => (
            <>
              <span className="data-table__primary">{counter.name}</span>
              <span className="data-table__secondary">Live counter view</span>
            </>
          ),
        },
        { key: 'code', header: 'Code', render: (counter) => counter.code },
        { key: 'defaultAccount', header: 'Default Account', render: (counter) => getDepartmentDefaultAccount(counter, accounts)?.accountHolder || 'Not linked' },
        { key: 'bank', header: 'Bank', render: (counter) => getDepartmentDefaultAccount(counter, accounts)?.bankName || 'Not linked' },
        {
          key: 'linkedAccounts',
          header: 'Linked Accounts',
          render: (counter) => {
            const linkedAccounts = getDepartmentLinkedAccounts(counter, accounts);
            return (
              <span className="status-chip status-chip--info">
                {linkedAccounts.length > 0 ? `${linkedAccounts.length} linked` : 'Unassigned'}
              </span>
            );
          },
        },
        {
          key: 'accountStatus',
          header: 'Account Status',
          render: (counter) => {
            const defaultAccount = getDepartmentDefaultAccount(counter, accounts);
            return defaultAccount ? (
              <span className={`status-chip ${defaultAccount.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                {defaultAccount.status}
              </span>
            ) : (
              <span className="status-chip status-chip--info">Unassigned</span>
            );
          },
        },
        { key: 'opening', header: 'Opening', render: (counter) => formatMoney(counter.openingBalance) },
        { key: 'current', header: 'Current', render: (counter) => formatMoney(counter.currentBalance) },
        {
          key: 'departmentStatus',
          header: 'Department Status',
          render: (counter) => (
            <span className={`status-chip ${counter.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {counter.status}
            </span>
          ),
        },
      ]}
      renderActions={(counter) => (
        <div className="table-actions">
          {onEdit ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(counter)}>
              <FaEdit size={12} />
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(counter.id)}>
              <FaTrashAlt size={12} />
              Delete
            </button>
          ) : null}
          {!hasActions ? <span className="page-muted small">View only</span> : null}
        </div>
      )}
    />
  );
};

export default DepartmentsTable;
