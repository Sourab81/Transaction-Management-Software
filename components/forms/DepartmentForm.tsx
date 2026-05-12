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

export interface DepartmentFormValues {
  name: string;
  remark?: string;
  accountIds: string[];
  defaultAccountId: string;
  status?: Counter['status'];
}

interface DepartmentFormProps {
  accounts: Account[];
  initialValues?: Counter;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: DepartmentFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({
  accounts,
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
  isSubmitting = false,
  submitError = '',
}) => {
  const initialLinkedAccountIds = getDepartmentLinkedAccountIds(initialValues);
  const [name, setName] = useState(initialValues?.name || '');
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [linkedAccountIds, setLinkedAccountIds] = useState<string[]>(initialLinkedAccountIds);
  const [defaultAccountId, setDefaultAccountId] = useState(getDepartmentDefaultAccountId(initialValues) || '');
  const [status, setStatus] = useState<Counter['status']>(initialValues?.status || 'Active');
  const [validationError, setValidationError] = useState('');

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => linkedAccountIds.includes(account.id)),
    [accounts, linkedAccountIds],
  );

  const toggleLinkedAccount = (accountId: string) => {
    const nextAccountIds = linkedAccountIds.includes(accountId)
      ? linkedAccountIds.filter((currentAccountId) => currentAccountId !== accountId)
      : [...linkedAccountIds, accountId];

    setLinkedAccountIds(nextAccountIds);
    if (!nextAccountIds.includes(defaultAccountId)) {
      setDefaultAccountId('');
    }
    setValidationError('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setValidationError('Department name is required.');
      return;
    }

    if (linkedAccountIds.length === 0) {
      setValidationError('Please select at least one bank account');
      return;
    }

    if (!defaultAccountId) {
      setValidationError('Please select a default bank account');
      return;
    }

    if (!linkedAccountIds.includes(defaultAccountId)) {
      setValidationError('Default account must be one of the linked accounts');
      return;
    }

    setValidationError('');
    void onSubmit({
      name: name.trim(),
      remark: remark.trim() || undefined,
      accountIds: linkedAccountIds,
      defaultAccountId,
      ...(initialValues ? { status } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {(validationError || submitError) && (
        <div className="form-alert" role="alert">
          {validationError || submitError}
        </div>
      )}

      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">Department</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update department details' : 'Create a department'}</h3>
          <p className="page-muted small mb-0">Manage the department name, note, and bank account mapping.</p>
        </div>
        {initialValues ? (
          <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
            {status}
          </span>
        ) : null}
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Department Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Department Name" placeholder="Example: IT Department" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Remark" placeholder="Optional note" value={remark} onChange={(event) => setRemark(event.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Linked Bank Accounts</div>
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
                      {account.bankName} - {account.accountNumber}
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
            <p className="page-muted small mb-0">Create a bank account before creating a department.</p>
          </div>
        )}
      </div>

      <div className="form-section-card">
        <div className="form-section-title">Default Bank Account</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Default Bank Account"
              value={defaultAccountId}
              onChange={(event) => {
                setDefaultAccountId(event.target.value);
                setValidationError('');
              }}
              options={[
                { value: '', label: selectedAccounts.length > 0 ? 'Choose Default Account' : 'Select linked accounts first' },
                ...selectedAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.accountHolder} - ${account.bankName} - ${account.accountNumber}`,
                })),
              ]}
              disabled={selectedAccounts.length === 0}
            />
          </div>
          {initialValues ? (
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
          ) : null}
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <Button type="submit" disabled={isSubmitting || accounts.length === 0}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default DepartmentForm;
