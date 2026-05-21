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
  isSubmitting?: boolean;
  submitError?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: ServiceFormValues) => void | Promise<void>;
}

const typeOptions = [
  { value: 'service', label: 'Service' },
  { value: 'product', label: 'Product' },
];

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

type InventoryFormType = NonNullable<Service['type']>;

const toTypeLabel = (type: InventoryFormType) => type === 'product' ? 'Product' : 'Service';

const ServiceEditorForm: React.FC<ServiceEditorFormProps> = ({
  departments,
  defaultDepartmentId,
  departmentLocked = false,
  initialValues,
  isSubmitting = false,
  submitError = '',
  submitLabel,
  onCancel,
  onSubmit,
}) => {
  const isEditMode = Boolean(initialValues);
  const resolvedDefaultDepartmentId = initialValues?.counterId || initialValues?.departmentId || defaultDepartmentId || '';
  const [name, setName] = useState(initialValues?.name || '');
  const [type, setType] = useState<InventoryFormType>(initialValues?.type || 'service');
  const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? 0));
  const [departmentId, setDepartmentId] = useState(resolvedDefaultDepartmentId);
  const [status, setStatus] = useState<Service['status']>(initialValues?.status || 'Active');
  const [remark, setRemark] = useState(initialValues?.remark ?? initialValues?.description ?? '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setValidationError('Inventory name is required.');
      return;
    }

    if (type !== 'service' && type !== 'product') {
      setValidationError('Inventory type must be Service or Product.');
      return;
    }

    const parsedQuantity = parseNonNegativeNumber(quantity);
    if (parsedQuantity === null) {
      setValidationError('Quantity must be a valid zero or positive number.');
      return;
    }

    const selectedDepartment = departments.find((department) => department.id === departmentId);
    const trimmedRemark = remark.trim();

    setValidationError('');
    onSubmit({
      departmentId: selectedDepartment?.id,
      departmentName: selectedDepartment?.name || 'General',
      name: trimmedName,
      category: toTypeLabel(type),
      price: 0,
      status,
      description: trimmedRemark,
      type,
      quantity: parsedQuantity,
      remark: trimmedRemark || null,
      counterId: selectedDepartment?.id || null,
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
          <p className="eyebrow mb-2">Inventory</p>
          <h3 className="h5 fw-semibold mb-1">{isEditMode ? 'Update inventory item' : 'Create inventory item'}</h3>
          <p className="page-muted small mb-0">Store services and products operators can select during transaction entry.</p>
        </div>
        {isEditMode ? (
          <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
            {status}
          </span>
        ) : null}
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Inventory Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input
              label="Inventory Name"
              placeholder="Example: Website Design"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setValidationError('');
              }}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Select
              label="Type"
              value={type}
              onChange={(event) => {
                setType(event.target.value as InventoryFormType);
                setValidationError('');
              }}
              options={typeOptions}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setValidationError('');
              }}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Select
              label="Counter/Department"
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setValidationError('');
              }}
              options={[
                { value: '', label: 'No Counter/Department' },
                ...departments.map((department) => ({
                  value: department.id,
                  label: `${department.name} (${department.code})`,
                })),
              ]}
              disabled={departmentLocked || departments.length === 0 || isSubmitting}
            />
            {departmentLocked ? (
              <p className="form-hint">Employees can create or update inventory only inside their assigned department.</p>
            ) : null}
          </div>
          {isEditMode ? (
            <div className="col-12 col-md-6">
              <Select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as Service['status'])}
                options={statusOptions}
                disabled={isSubmitting}
              />
            </div>
          ) : null}
          <div className="col-12">
            <label className="form-label">Remark</label>
            <textarea
              className="form-control styled-textarea"
              rows={3}
              placeholder="Optional note for this inventory item"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
        <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
};

export default ServiceEditorForm;
