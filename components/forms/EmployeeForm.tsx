import React, { useState } from 'react';
import { buildDefaultCustomerPermissions } from '../../lib/platform-structure';
import type { Employee } from '../../lib/store';
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  phoneNumberValidationMessage,
} from '../../lib/validators/phone-validator';
import {
  isEmpty,
  isValidEmail,
  validateRequiredFields,
  hasErrors,
  type ValidatedField,
} from '../../lib/validators/required-fields';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type EmployeeFormValues = Omit<Employee, 'id'> & {
  password?: string;
};

interface EmployeeFormProps {
  departments?: Counter[];
  initialValues?: Employee;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: EmployeeFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string;
  fieldErrorsFromBackend?: Record<string, string>;
}

import type { Counter } from '../../lib/store';

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
  isSubmitting = false,
  submitError = '',
  fieldErrorsFromBackend = {},
}) => {
  const [fullName, setFullName] = useState(initialValues?.fullName || initialValues?.name || '');
  const [nickName, setNickName] = useState(initialValues?.nickName || initialValues?.displayName || initialValues?.name || '');
  const [gender, setGender] = useState(initialValues?.gender || '');
  const [dob, setDob] = useState(initialValues?.dob || '');
  const [mobile, setMobile] = useState(initialValues?.mobile || initialValues?.phone || '');
  const [address, setAddress] = useState(initialValues?.address || '');
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Employee['status']>(initialValues?.status || 'Active');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mergedFieldErrors = { ...fieldErrors, ...fieldErrorsFromBackend };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const validatedFields: ValidatedField[] = [
      { value: fullName, label: 'Full Name', required: true },
      { value: nickName, label: 'Nick Name', required: true },
      { value: mobile, label: 'Mobile', required: true, phone: true },
      { value: email, label: 'Email', required: true, email: true },
      { value: password, label: 'Password', required: !initialValues },
      { value: status, label: 'Status', required: true },
    ];
    
    const errors = validateRequiredFields(validatedFields);
    setFieldErrors(errors);

    if (!hasErrors(errors)) {
      if (!fullName.trim()) {
        setValidationError('Full Name is required.');
        return;
      }

      if (!nickName.trim()) {
        setValidationError('Nick Name is required.');
        return;
      }

      if (!isValidPhoneNumber(mobile)) {
        setFieldErrors(prev => ({ ...prev, mobile: phoneNumberValidationMessage }));
        return;
      }

      if (!initialValues && !password.trim()) {
        setValidationError('Password is required when creating an employee.');
        return;
      }

      setValidationError('');
      void onSubmit({
        name: nickName.trim() || fullName.trim(),
        fullName: fullName.trim(),
        nickName: nickName.trim(),
        displayName: nickName.trim() || fullName.trim(),
        phone: normalizePhoneNumber(mobile),
        mobile: normalizePhoneNumber(mobile),
        email: email.trim().toLowerCase(),
        password: password || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
        address: address.trim() || undefined,
        remark: remark.trim() || undefined,
        permissions: buildDefaultCustomerPermissions(),
        status,
        joinedDate: initialValues?.joinedDate || initialValues?.addedDate,
        addedDate: initialValues?.addedDate,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {validationError ? (
        <div className="form-alert" role="alert">
          {validationError}
        </div>
      ) : null}

      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">Employee</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update employee profile' : 'Create employee profile'}</h3>
          <p className="page-muted small mb-0">Keep staff details and access permissions current for this business workspace.</p>
        </div>
        <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Personal Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Full Name" placeholder="Example: Aarav Patel" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Nick Name" placeholder="Example: Aarav" value={nickName} onChange={(event) => setNickName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Select
              label="Gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              options={[
                { value: '', label: 'Select Gender' },
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input label="DOB" type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Mobile"
              type="tel"
              inputMode="numeric"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              onChange={(event) => {
                setMobile(event.target.value);
                setFieldErrors(prev => ({ ...prev, mobile: '' }));
              }}
              error={fieldErrors.mobile}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Address" placeholder="Optional address" value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
          <div className="col-12">
            <Input label="Remark" placeholder="Optional remark" value={remark} onChange={(event) => setRemark(event.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Login Credentials</div>
        <p className="form-hint mt-0 mb-3">Business owners can update the employee login email and set a new password here.</p>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Email" type="email" placeholder="employee@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <div className="app-field">
              <label className="form-label">Password</label>
              <div className="password-field">
                <input
                  className="form-control"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={initialValues ? 'Enter a new password to update' : 'Create a secure password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required={!initialValues}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section-card">
        <div className="form-section-title">Status</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Status"
              value={status || 'Active'}
              onChange={(event) => setStatus(event.target.value as Employee['status'])}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>
      </div>



      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : submitLabel}</Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
