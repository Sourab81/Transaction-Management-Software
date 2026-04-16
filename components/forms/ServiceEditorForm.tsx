import React, { useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Counter, Service } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type ServiceFormValues = Omit<Service, 'id'>;

interface ServiceEditorFormProps {
  departments: Counter[];
  defaultDepartmentId?: string;
  departmentLocked?: boolean;
  initialValues?: Service;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: ServiceFormValues) => void;
}

const ServiceEditorForm: React.FC<ServiceEditorFormProps> = ({
  departments,
  defaultDepartmentId,
  departmentLocked = false,
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
}) => {
  const resolvedDefaultDepartmentId = initialValues?.departmentId || defaultDepartmentId || departments[0]?.id || '';
  const [name, setName] = useState(initialValues?.name || '');
  const [departmentId, setDepartmentId] = useState(resolvedDefaultDepartmentId);
  const [category, setCategory] = useState(initialValues?.category || 'General');
  const [price, setPrice] = useState(String(initialValues?.price ?? 0));
  const [status, setStatus] = useState<Service['status']>(initialValues?.status || 'Active');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const servicePrice = parseNonNegativeNumber(price);

    if (servicePrice === null) {
      setValidationError('Price must be a valid zero or positive number.');
      return;
    }

    const selectedDepartment = departments.find((department) => department.id === departmentId);
    if (!selectedDepartment) {
      setValidationError('Choose the department that should own this service.');
      return;
    }

    setValidationError('');
    onSubmit({
      departmentId: selectedDepartment.id,
      departmentName: selectedDepartment.name,
      name,
      category,
      price: servicePrice,
      status,
      description,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {validationError && (
        <div className="form-alert" role="alert">
          {validationError}
        </div>
      )}

      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">Service</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update service details' : 'Create a new service'}</h3>
          <p className="page-muted small mb-0">Keep the name, price, and status clear so operators can process transactions faster.</p>
        </div>
        <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Basic Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <Select
              label="Department"
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setValidationError('');
              }}
              options={[
                { value: '', label: departments.length > 0 ? 'Select Department' : 'No Department Available' },
                ...departments.map((department) => ({
                  value: department.id,
                  label: `${department.name} (${department.code})`,
                })),
              ]}
              disabled={departmentLocked || departments.length === 0}
              required
            />
            {departmentLocked ? (
              <p className="form-hint">Employees can create or update services only inside their assigned department.</p>
            ) : null}
          </div>
          <div className="col-12 col-md-4">
            <Input label="Service Name" placeholder="Example: Mobile Recharge" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-4">
            <Input label="Category" placeholder="Example: Telecom" value={category} onChange={(event) => setCategory(event.target.value)} required />
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea className="form-control styled-textarea" rows={3} placeholder="Short note operators can understand quickly" value={description} onChange={(event) => setDescription(event.target.value)} required />
          </div>
        </div>
      </div>

      <div className="form-section-card">
        <div className="form-section-title">Pricing And Status</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input
              label="Price"
              type="number"
              min="0"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Service['status'])}
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

export default ServiceEditorForm;
