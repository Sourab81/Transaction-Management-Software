import React, { useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Account } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type AccountFormValues = Omit<Account, 'id' | 'date'>;

interface AccountFormProps {
  initialValues?: Account;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: AccountFormValues) => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ initialValues, submitLabel, onCancel, onSubmit }) => {
  const [accountHolder, setAccountHolder] = useState(initialValues?.accountHolder || '');
  const [bankName, setBankName] = useState(initialValues?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(initialValues?.accountNumber || '');
  const [ifsc, setIfsc] = useState(initialValues?.ifsc || '');
  const [openingBalance, setOpeningBalance] = useState(String(initialValues?.openingBalance ?? 0));
  const [currentBalance, setCurrentBalance] = useState(String(initialValues?.currentBalance ?? 0));
  const [status, setStatus] = useState<Account['status']>(initialValues?.status || 'Active');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedOpeningBalance = parseNonNegativeNumber(openingBalance);
    const parsedCurrentBalance = parseNonNegativeNumber(currentBalance);

    if (parsedOpeningBalance === null || parsedCurrentBalance === null) {
      setValidationError('Balances must be valid zero or positive numbers.');
      return;
    }

    setValidationError('');
    onSubmit({
      accountHolder,
      bankName,
      accountNumber,
      ifsc,
      openingBalance: parsedOpeningBalance,
      currentBalance: parsedCurrentBalance,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {validationError && (
        <div className="form-alert" role="alert">
          {validationError}
        </div>
      )}

      <div className="form-workflow-panel mb-4" >
        <div>
          <p className="eyebrow mb-2">Payment</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update account record' : 'Create account record'}</h3>
          <p className="page-muted small mb-0">Keep bank and balance details clean for payment tracking.</p>
        </div>
        <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Bank Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Account Holder" placeholder="Example: Riya Sharma" value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Bank Name" placeholder="Example: HDFC Bank" value={bankName} onChange={(event) => setBankName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Account Number" placeholder="Enter account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="IFSC" placeholder="Example: HDFC0001234" value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} required />
          </div>
        </div>
      </div>

      <div className="form-section-card">
        <div className="form-section-title">Balance And Status</div>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <Input
              label="Opening Balance"
              type="number"
              min="0"
              value={openingBalance}
              onChange={(event) => {
                setOpeningBalance(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>
          <div className="col-12 col-md-4">
            <Input
              label="Current Balance"
              type="number"
              min="0"
              value={currentBalance}
              onChange={(event) => {
                setCurrentBalance(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>
          <div className="col-12 col-md-4">
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Account['status'])}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
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

export default AccountForm;
