import React, { useState } from 'react';
import type { Service } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type ServiceFormValues = Omit<Service, 'id'>;

interface ServiceEditorFormProps {
  initialValues?: Service;
  isSubmitting?: boolean;
  submitError?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: ServiceFormValues) => void | Promise<void>;
}

const inventoryTypeOptions = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
];

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const isPositiveWholeNumber = (value: string) => /^[1-9]\d*$/.test(value.trim());

const ServiceEditorForm: React.FC<ServiceEditorFormProps> = ({
  initialValues,
  isSubmitting = false,
  submitError = '',
  submitLabel,
  onCancel,
  onSubmit,
}) => {
  const initialType = initialValues?.type || 'product';
  const [name, setName] = useState(initialValues?.name || '');
  const [type, setType] = useState<Service['type']>(initialType);
  const [quantity, setQuantity] = useState(
    initialType === 'product'
      ? String(initialValues?.currentStock ?? initialValues?.quantity ?? '')
      : '',
  );
  const [status, setStatus] = useState<Service['status']>(initialValues?.status || 'Active');
  const [remark, setRemark] = useState(initialValues?.remark ?? initialValues?.description ?? '');
  const [validationError, setValidationError] = useState('');

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value as Service['type'];
    setType(nextType);
    setValidationError('');

    if (nextType === 'service') {
      setQuantity('');
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedRemark = remark.trim();
    const normalizedType = type || 'product';

    if (!trimmedName) {
      setValidationError('Inventory name is required.');
      return;
    }

    if (!normalizedType) {
      setValidationError('Inventory type is required.');
      return;
    }

    if (normalizedType === 'product' && !isPositiveWholeNumber(quantity)) {
      setValidationError('Quantity is required and must be a positive whole number.');
      return;
    }

    setValidationError('');
    onSubmit({
      departmentName: initialValues?.departmentName || 'General',
      name: trimmedName,
      category: normalizedType === 'product' ? 'Product' : 'Service',
      price: initialValues?.price ?? 0,
      status,
      description: trimmedRemark,
      type: normalizedType,
      ...(normalizedType === 'product' ? { quantity: Number(quantity.trim()) } : {}),
      remark: trimmedRemark || null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {(validationError || submitError) && (
        <div className="form-alert" role="alert">
          {validationError || submitError}
        </div>
      )}

      <div className="form-section-card mb-4">
        <div className="form-section-title">Inventory Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input
              label="Inventory Name"
              placeholder="Example: SIM Card"
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
              label="Inventory Type"
              value={type || 'product'}
              onChange={handleTypeChange}
              options={inventoryTypeOptions}
              disabled={isSubmitting}
              required
            />
          </div>

          {type === 'product' ? (
            <div className="col-12 col-md-6">
              <Input
                label="Quantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setValidationError('');
                }}
                disabled={isSubmitting}
                required
              />
            </div>
          ) : null}

          <div className="col-12 col-md-6">
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Service['status'])}
              options={statusOptions}
              disabled={isSubmitting}
            />
          </div>

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
