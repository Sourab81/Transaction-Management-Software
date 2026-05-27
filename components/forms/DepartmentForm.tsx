import React, { useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Counter } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export interface DepartmentFormValues {
  name: string;
  openingBalance: number;
  remark?: string;
  status?: Counter['status'];
}

interface DepartmentFormProps {
  initialValues?: Counter;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: DepartmentFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
  isSubmitting = false,
  submitError = '',
}) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [openingBalance, setOpeningBalance] = useState(String(initialValues?.openingBalance ?? 0));
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [status, setStatus] = useState<Counter['status']>(initialValues?.status || 'Active');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setValidationError('Department name is required.');
      return;
    }

    const parsedOpeningBalance = parseNonNegativeNumber(openingBalance);
    if (parsedOpeningBalance === null) {
      setValidationError('Opening balance must be a zero or positive number.');
      return;
    }

    setValidationError('');
    void onSubmit({
      name: name.trim(),
      openingBalance: parsedOpeningBalance,
      remark: remark.trim() || undefined,
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
          <p className="page-muted small mb-0">Manage the department name, opening balance, and note.</p>
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
            <Input
              label="Opening Balance"
              min="0"
              placeholder="0"
              type="number"
              value={openingBalance}
              onChange={(event) => {
                setOpeningBalance(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>
          <div className="col-12">
            <Input label="Remark" placeholder="Optional note" value={remark} onChange={(event) => setRemark(event.target.value)} />
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default DepartmentForm;
