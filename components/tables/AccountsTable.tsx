import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Account } from '../../lib/store';

interface AccountsTableProps {
  accounts: Account[];
  onEdit?: (account: Account) => void;
  onDelete?: (accountId: string) => void;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const AccountsTable: React.FC<AccountsTableProps> = ({ accounts, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Accounts</p>
          <h3 className="table-panel__title">Payment accounts</h3>
          <p className="table-panel__copy">Bank details, balances, and account status from a single list.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Account Holder</th>
              <th>Bank</th>
              <th>Account No.</th>
              <th>IFSC</th>
              <th>Opening</th>
              <th>Current</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={10}>No account records found.</td>
              </tr>
            ) : (
              accounts.map((account, index) => (
                <tr key={account.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Account Holder"><span className="data-table__primary">{account.accountHolder}</span></td>
                  <td data-label="Bank">{account.bankName}</td>
                  <td data-label="Account No.">{account.accountNumber}</td>
                  <td data-label="IFSC">{account.ifsc}</td>
                  <td data-label="Opening">{formatMoney(account.openingBalance)}</td>
                  <td data-label="Current">{formatMoney(account.currentBalance)}</td>
                  <td data-label="Status">
                    <span className={`status-chip ${account.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                      {account.status}
                    </span>
                  </td>
                  <td data-label="Date">{account.date}</td>
                  <td data-label="Actions">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AccountsTable;
