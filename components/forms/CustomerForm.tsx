import React, { useState } from 'react';
import type { BusinessCustomer } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';

export type CustomerFormValues = Omit<BusinessCustomer, 'id'>;

interface CustomerFormProps {
  initialValues?: BusinessCustomer;
  submitLabel: string;
  entityLabel?: string;
  onCancel: () => void;
  onSubmit: (values: CustomerFormValues) => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  initialValues,
  submitLabel,
  entityLabel = 'Customer',
  onCancel,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState(initialValues?.customerName || initialValues?.name || '');
  const [mobileNo, setMobileNo] = useState(initialValues?.mobileNo || initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [address, setAddress] = useState(initialValues?.address || '');
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedCustomerName = customerName.trim();
    const trimmedMobileNo = mobileNo.trim();
    if (!trimmedCustomerName) {
      setValidationError('Customer name is required.');
      return;
    }

    if (!trimmedMobileNo) {
      setValidationError('Mobile number is required.');
      return;
    }

    onSubmit({
      name: trimmedCustomerName,
      customerName: trimmedCustomerName,
      phone: trimmedMobileNo,
      mobileNo: trimmedMobileNo,
      email: email.trim(),
      address: address.trim() || null,
      remark: remark.trim() || null,
      status: initialValues?.status || 'Active',
      joinedDate: initialValues?.joinedDate || new Date().toISOString().split('T')[0],
      addedDate: initialValues?.addedDate,
      updatedDate: initialValues?.updatedDate,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">{entityLabel}</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? `Update ${entityLabel.toLowerCase()} profile` : `Create ${entityLabel.toLowerCase()} profile`}</h3>
          <p className="page-muted small mb-0">Customer profiles power transaction selection, contact details, and follow-up visibility.</p>
        </div>
      </div>

      {validationError ? (
        <div className="form-alert" role="alert">
          {validationError}
        </div>
      ) : null}

      <div className="form-section-card mb-4">
        <div className="form-section-title">Contact Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input
              label="Customer Name"
              placeholder="Example: Riya Sharma"
              value={customerName}
              onChange={(event) => {
                setCustomerName(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Mobile No."
              type="tel"
              inputMode="numeric"
              placeholder="Enter mobile number"
              value={mobileNo}
              onChange={(event) => {
                setMobileNo(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Email" type="email" placeholder="customer@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Address" placeholder="Customer address" value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label">Remark</label>
            <textarea
              className="form-control styled-textarea"
              rows={3}
              placeholder="Optional note"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
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

export default CustomerForm;
