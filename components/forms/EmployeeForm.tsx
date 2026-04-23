import React, { useState } from 'react';
import {
  buildDefaultCustomerPermissions,
  customerPermissionSections,
  intersectCustomerPermissions,
  normalizeCustomerPermissions,
  type CustomerPermissions,
} from '../../lib/platform-structure';
import type { Counter, Employee } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type EmployeeFormValues = Omit<Employee, 'id'>;

interface EmployeeFormProps {
  businessPermissions: CustomerPermissions;
  departments: Counter[];
  initialValues?: Employee;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: EmployeeFormValues) => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  businessPermissions,
  departments,
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
}) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [password, setPassword] = useState(initialValues?.password || '');
  const [departmentId, setDepartmentId] = useState(initialValues?.departmentId || '');
  const [status, setStatus] = useState<Employee['status']>(initialValues?.status || 'Active');
  const [joinedDate, setJoinedDate] = useState(initialValues?.joinedDate || new Date().toISOString().split('T')[0]);
  const [showPassword, setShowPassword] = useState(Boolean(initialValues?.password));
  const [validationError, setValidationError] = useState('');
  const [permissions, setPermissions] = useState<Employee['permissions']>(
    intersectCustomerPermissions(
      normalizeCustomerPermissions(initialValues?.permissions ?? businessPermissions ?? buildDefaultCustomerPermissions()),
      businessPermissions,
    )
  );

  const enabledPermissionCount = Object.values(permissions).filter((enabled) => enabled === 1).length;

  const isPermissionAvailable = (permissionId: string) => businessPermissions[permissionId] === 1;

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

    if (!departmentId) {
      setValidationError('Assign a department before saving the employee.');
      return;
    }

    setValidationError('');
    onSubmit({
      name,
      phone,
      email,
      password,
      permissions: intersectCustomerPermissions(permissions, businessPermissions),
      departmentId: departmentId || undefined,
      status,
      joinedDate,
    });
  };

  const departmentOptions = [
    { value: '', label: departments.length > 0 ? 'Select Department' : 'No department available yet' },
    ...departments.map((department) => ({
      value: department.id,
      label: `${department.name} | ${department.code}`,
    })),
  ];

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
          <p className="page-muted small mb-0">Keep the employee directory current so the business team can manage staff access and department ownership clearly.</p>
        </div>
        <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Employee Details</div>
        <p className="form-hint mt-0 mb-3">Each employee must be assigned to one department, and their transactions will stay locked to that department.</p>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Employee Name" placeholder="Example: Aarav Patel" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Phone" placeholder="Enter mobile number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Joined Date" type="date" value={joinedDate} onChange={(event) => setJoinedDate(event.target.value)} />
          </div>
          <div className="col-12">
            <Select
              label="Assigned Department"
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setValidationError('');
              }}
              options={departmentOptions}
              disabled={departments.length === 0}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Login Credentials</div>
        <p className="form-hint mt-0 mb-3">Business owners can review and update the employee login email and password here.</p>
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
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
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
          {customerPermissionSections.map((section) => {
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
                    const isAvailable = isPermissionAvailable(item.id);

                    return (
                      <div key={item.id} className={`permission-row ${item.indent ? 'permission-row--child' : ''}`}>
                        <div>
                          <span className="permission-label">{item.label}</span>
                          {!isAvailable ? (
                            <span className="form-hint d-block mt-1">Enable this first on the business profile.</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className={`permission-toggle ${isEnabled ? 'is-enabled' : ''}`}
                          aria-pressed={isEnabled}
                          onClick={() => togglePermission(item.id)}
                          disabled={!isAvailable}
                        >
                          <span className="permission-toggle__thumb" />
                          <span className="permission-toggle__text">{!isAvailable ? 'Locked' : isEnabled ? 'On' : 'Off'}</span>
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
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Cancel</button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
