import React, { useState } from 'react';
import {
  buildDefaultCustomerPermissions,
  customerPermissionSections,
  intersectCustomerPermissions,
  normalizeCustomerPermissions,
  type CustomerPermissions,
} from '../../lib/platform-structure';
import type { Counter, Employee } from '../../lib/store';
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  phoneNumberValidationMessage,
} from '../../lib/validators/phone-validator';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type EmployeeFormValues = Omit<Employee, 'id'> & {
  password?: string;
};

interface EmployeeFormProps {
  businessPermissions: CustomerPermissions;
  departments?: Counter[];
  initialValues?: Employee;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: EmployeeFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  businessPermissions,
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
  isSubmitting = false,
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
  const [phoneError, setPhoneError] = useState('');
  const [permissions, setPermissions] = useState<Employee['permissions']>(
    intersectCustomerPermissions(
      normalizeCustomerPermissions(initialValues?.permissions ?? businessPermissions ?? buildDefaultCustomerPermissions()),
      businessPermissions,
    )
  );

  const enabledPermissionCount = Object.values(permissions).filter((enabled) => enabled === 1).length;

  const isPermissionAvailable = (permissionId: string) => businessPermissions[permissionId] === 1;
  const availablePermissionSections = customerPermissionSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.kind === 'label'
          ? section.items.some((sectionItem) => sectionItem.kind !== 'label' && isPermissionAvailable(sectionItem.id))
          : isPermissionAvailable(item.id)
      ),
    }))
    .filter((section) => section.items.some((item) => item.kind !== 'label'));

  const togglePermission = (permissionId: string) => {
    if (!isPermissionAvailable(permissionId)) {
      return;
    }

    setPermissions((current) => ({
      ...current,
      [permissionId]: current[permissionId] === 1 ? 0 : 1,
    }));
  };

  const toggleSectionPermissions = (sectionId: string) => {
    const section = customerPermissionSections.find((permissionSection) => permissionSection.id === sectionId);

    if (!section) {
      return;
    }

    const grantableItems = section.items.filter((item) => item.kind !== 'label' && isPermissionAvailable(item.id));
    if (grantableItems.length === 0) {
      return;
    }

    setPermissions((current) => {
      const shouldEnableAll = !grantableItems.every((item) => current[item.id] === 1);
      const nextPermissions = { ...current };

      grantableItems.forEach((item) => {
        nextPermissions[item.id] = shouldEnableAll ? 1 : 0;
      });

      return nextPermissions;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!fullName.trim()) {
      setValidationError('Full Name is required.');
      return;
    }

    if (!nickName.trim()) {
      setValidationError('Nick Name is required.');
      return;
    }

    if (!isValidPhoneNumber(mobile)) {
      setPhoneError(phoneNumberValidationMessage);
      return;
    }

    if (!email.trim()) {
      setValidationError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (!initialValues && !password.trim()) {
      setValidationError('Password is required when creating an employee.');
      return;
    }

    if (enabledPermissionCount === 0) {
      setValidationError('Select at least one permission.');
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
      permissions: intersectCustomerPermissions(permissions, businessPermissions),
      status,
      joinedDate: initialValues?.joinedDate || initialValues?.addedDate,
      addedDate: initialValues?.addedDate,
    });
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
                setPhoneError('');
              }}
              error={phoneError}
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

      <div className="form-section-card mt-4">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-3">
          <div>
            <div className="form-section-title mb-1">Employee Permissions</div>
            <p className="page-muted small mb-0">Give this employee only the workspace options they should be allowed to use. Business-locked permissions stay unavailable here.</p>
          </div>
          <span className="status-chip status-chip--info">{enabledPermissionCount} enabled</span>
        </div>

        <div className="permission-builder">
          {availablePermissionSections.map((section) => {
            const toggleItems = section.items.filter((item) => item.kind !== 'label');
            const grantableItems = toggleItems.filter((item) => isPermissionAvailable(item.id));
            const enabledCount = grantableItems.filter((item) => permissions[item.id] === 1).length;
            const isSectionEnabled = grantableItems.length > 0 && enabledCount === grantableItems.length;

            return (
              <div key={section.id} className="permission-section">
                <div className="permission-section__header">
                  <div>
                    <h4 className="permission-section__title">{section.label}</h4>
                    <p className="permission-section__meta mb-0">{enabledCount} of {grantableItems.length} enabled</p>
                  </div>
                  <button
                    type="button"
                    className={`permission-toggle permission-toggle--section ${isSectionEnabled ? 'is-enabled' : ''}`}
                    aria-pressed={isSectionEnabled}
                    aria-label={`Toggle all ${section.label} employee permissions`}
                    onClick={() => toggleSectionPermissions(section.id)}
                    disabled={grantableItems.length === 0}
                  >
                    <span className="permission-toggle__thumb" />
                    <span className="permission-toggle__text">{grantableItems.length === 0 ? 'Locked' : isSectionEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>
                <div className="permission-list">
                  {section.items.map((item) => {
                    if (item.kind === 'label') {
                      return (
                        <div
                          key={item.id}
                          className={`permission-group-label ${item.indent ? 'permission-group-label--child' : ''}`}
                        >
                          {item.label}
                        </div>
                      );
                    }

                    const isEnabled = permissions[item.id] === 1;

                    return (
                      <div key={item.id} className={`permission-row ${item.indent ? 'permission-row--child' : ''}`}>
                        <div>
                          <span className="permission-label">{item.label}</span>
                        </div>
                        <button
                          type="button"
                          className={`permission-toggle ${isEnabled ? 'is-enabled' : ''}`}
                          aria-pressed={isEnabled}
                          onClick={() => togglePermission(item.id)}
                        >
                          <span className="permission-toggle__thumb" />
                          <span className="permission-toggle__text">{isEnabled ? 'On' : 'Off'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
