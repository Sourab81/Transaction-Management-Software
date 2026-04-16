import React, { useMemo, useState } from 'react';
import {
  getDepartmentDefaultAccountId,
  getDepartmentLinkedAccountIds,
  type Account,
  type Counter,
} from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type DepartmentFormValues = Omit<Counter, 'id'>;

interface DepartmentFormProps {
  accounts: Account[];
  initialValues?: Counter;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: DepartmentFormValues) => void;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ accounts, initialValues, submitLabel, onCancel, onSubmit }) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [code, setCode] = useState(initialValues?.code || '');
  const [linkedAccountIds, setLinkedAccountIds] = useState<string[]>(getDepartmentLinkedAccountIds(initialValues));
  const [defaultAccountId, setDefaultAccountId] = useState(getDepartmentDefaultAccountId(initialValues) || '');
  const [openingBalance, setOpeningBalance] = useState(String(initialValues?.openingBalance ?? ''));
  const [currentBalance, setCurrentBalance] = useState(String(initialValues?.currentBalance ?? ''));
  const [status, setStatus] = useState<Counter['status']>(initialValues?.status || 'Active');

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => linkedAccountIds.includes(account.id)),
    [accounts, linkedAccountIds],
  );
  const resolvedDefaultAccountId = linkedAccountIds.length > 0
    ? (linkedAccountIds.includes(defaultAccountId) ? defaultAccountId : linkedAccountIds[0])
    : '';

  const defaultAccount = useMemo(
    () => selectedAccounts.find((account) => account.id === resolvedDefaultAccountId),
    [resolvedDefaultAccountId, selectedAccounts],
  );

  const toggleLinkedAccount = (accountId: string) => {
    setLinkedAccountIds((currentAccountIds) =>
      currentAccountIds.includes(accountId)
        ? currentAccountIds.filter((currentAccountId) => currentAccountId !== accountId)
        : [...currentAccountIds, accountId]
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onSubmit({
      name,
      code,
      linkedAccountIds,
      defaultAccountId: resolvedDefaultAccountId || undefined,
      linkedAccountId: resolvedDefaultAccountId || undefined,
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(currentBalance) || 0,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">Department</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update department details' : 'Create a department'}</h3>
          <p className="page-muted small mb-0">Manage the department code, linked accounts, default account, and live balance details the business workspace depends on.</p>
        </div>
        <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Department Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Department Name" placeholder="Example: Retail Counter" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Code" placeholder="Example: C3" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required />
          </div>
          <div className="col-12">
            <div className="form-section-title mb-2">Department Accounts</div>
            {accounts.length > 0 ? (
              <div className="department-account-builder">
                {accounts.map((account) => {
                  const isSelected = linkedAccountIds.includes(account.id);

                  return (
                    <label
                      key={account.id}
                      className={`department-account-option ${isSelected ? 'is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLinkedAccount(account.id)}
                      />
                      <div className="department-account-option__body">
                        <p className="department-account-option__title">{account.accountHolder}</p>
                        <p className="department-account-option__meta">
                          {account.bankName} | A/C {account.accountNumber} | IFSC {account.ifsc}
                        </p>
                        <span className={`status-chip department-account-option__status ${account.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                          {account.status}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="counter-chip h-100">
                <p className="fw-semibold mb-1">No bank account available yet</p>
                <p className="page-muted small mb-0">Create bank accounts in the Accounts page before linking them to this department.</p>
              </div>
            )}
          </div>
          <div className="col-12">
            <Select
              label="Default Account"
              value={resolvedDefaultAccountId}
              onChange={(event) => setDefaultAccountId(event.target.value)}
              options={[
                { value: '', label: linkedAccountIds.length > 0 ? 'Choose Default Account' : 'Link an account first' },
                ...selectedAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.accountHolder} | ${account.bankName}`,
                })),
              ]}
              disabled={linkedAccountIds.length === 0}
            />
            <p className="page-muted small mb-0 mt-2">This default account is used automatically for non-cash transactions unless the operator changes it.</p>
          </div>
        </div>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Balances</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Opening Balance" type="number" min="0" step="0.01" placeholder="0" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Current Balance" type="number" min="0" step="0.01" placeholder="0" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} required />
          </div>
        </div>
      </div>

      <div className="form-section-card">
        <div className="form-section-title">Status</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Department Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Counter['status'])}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <div className="col-12 col-md-6">
            <div className="counter-chip h-100">
              <p className="eyebrow mb-2">Default Account</p>
              <p className="fw-semibold mb-1">{defaultAccount ? defaultAccount.accountHolder : 'No default account selected'}</p>
              <p className="page-muted small mb-0">
                {defaultAccount
                  ? `${defaultAccount.bankName} | ${linkedAccountIds.length} linked account${linkedAccountIds.length === 1 ? '' : 's'}`
                  : 'Link one or more accounts and choose which one should be the department default.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Cancel</button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default DepartmentForm;
