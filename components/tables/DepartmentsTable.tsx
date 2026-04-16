import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import {
  getDepartmentDefaultAccount,
  getDepartmentLinkedAccounts,
  type Account,
  type Counter,
} from '../../lib/store';

interface DepartmentsTableProps {
  accounts: Account[];
  counters: Counter[];
  onEdit?: (counter: Counter) => void;
  onDelete?: (counterId: string) => void;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const DepartmentsTable: React.FC<DepartmentsTableProps> = ({ accounts, counters, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Departments</p>
          <h3 className="table-panel__title">Department and counter records</h3>
          <p className="table-panel__copy">Track department codes, default posting accounts, linked account counts, balances, and status from one searchable table.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Department</th>
              <th>Code</th>
              <th>Default Account</th>
              <th>Bank</th>
              <th>Linked Accounts</th>
              <th>Account Status</th>
              <th>Opening</th>
              <th>Current</th>
              <th>Department Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {counters.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={11}>No department records found.</td>
              </tr>
            ) : (
              counters.map((counter, index) => {
                const linkedAccounts = getDepartmentLinkedAccounts(counter, accounts);
                const defaultAccount = getDepartmentDefaultAccount(counter, accounts);

                return (
                  <tr key={counter.id}>
                    <td data-label="S.No">{index + 1}</td>
                    <td data-label="Department">
                      <span className="data-table__primary">{counter.name}</span>
                      <span className="data-table__secondary">Live counter view</span>
                    </td>
                    <td data-label="Code">{counter.code}</td>
                    <td data-label="Default Account">{defaultAccount ? defaultAccount.accountHolder : 'Not linked'}</td>
                    <td data-label="Bank">{defaultAccount ? defaultAccount.bankName : 'Not linked'}</td>
                    <td data-label="Linked Accounts">
                      {linkedAccounts.length > 0 ? (
                        <span className="status-chip status-chip--info">
                          {linkedAccounts.length} linked
                        </span>
                      ) : (
                        <span className="status-chip status-chip--info">Unassigned</span>
                      )}
                    </td>
                    <td data-label="Account Status">
                      {defaultAccount ? (
                        <span className={`status-chip ${defaultAccount.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                          {defaultAccount.status}
                        </span>
                      ) : (
                        <span className="status-chip status-chip--info">Unassigned</span>
                      )}
                    </td>
                    <td data-label="Opening">{formatMoney(counter.openingBalance)}</td>
                    <td data-label="Current">{formatMoney(counter.currentBalance)}</td>
                    <td data-label="Department Status">
                      <span className={`status-chip ${counter.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                        {counter.status}
                      </span>
                    </td>
                    <td data-label="Actions">
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DepartmentsTable;
