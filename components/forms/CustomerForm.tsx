import React, { useState } from 'react';
import type { BusinessCustomer } from '../../lib/store';
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  phoneNumberValidationMessage,
} from '../../lib/validators/phone-validator';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type CustomerFormValues = Omit<BusinessCustomer, 'id'>;

interface CustomerFormProps {
  initialValues?: BusinessCustomer;
  submitLabel: string;
  entityLabel?: string;
  onCancel: () => void;
  onSubmit: (values: CustomerFormValues) => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ initialValues, submitLabel, entityLabel = 'Customer', onCancel, onSubmit }) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [status, setStatus] = useState<BusinessCustomer['status']>(initialValues?.status || 'Active');
  const [joinedDate, setJoinedDate] = useState(initialValues?.joinedDate || new Date().toISOString().split('T')[0]);
  const [phoneError, setPhoneError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidPhoneNumber(phone)) {
      setPhoneError(phoneNumberValidationMessage);
      return;
    }

    onSubmit({
      name,
      phone: normalizePhoneNumber(phone),
      email,
      status,
      joinedDate,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">{entityLabel}</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? `Update ${entityLabel.toLowerCase()} profile` : `Create ${entityLabel.toLowerCase()} profile`}</h3>
          <p className="page-muted small mb-0">Customer profiles power service autofill, contact details, and follow-up visibility inside the business workspace.</p>
        </div>
        <span className={`status-chip ${(status || 'Active') === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status || 'Active'}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Contact Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label={`${entityLabel} Name`} placeholder="Example: Riya Sharma" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Phone"
              type="tel"
              inputMode="numeric"
              placeholder="Enter 10-digit mobile number"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setPhoneError('');
              }}
              error={phoneError}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Email" type="email" placeholder="customer@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section-card">
        <div className="form-section-title">Profile Status</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Status"
              value={status || 'Active'}
              onChange={(event) => setStatus(event.target.value as BusinessCustomer['status'])}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Joined Date" type="date" value={joinedDate} onChange={(event) => setJoinedDate(event.target.value)} />
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

export default CustomerForm;
