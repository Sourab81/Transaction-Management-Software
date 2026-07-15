import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BusinessCustomer } from '../../lib/store';
import { useCustomerColors } from '../../lib/hooks/useCustomerColors';
import { useCustomerCategories } from '../../lib/hooks/useCustomerCategories';
import Button from '../ui/Button';
import Input from '../ui/Input';

export type CustomerFormValues = Omit<BusinessCustomer, 'id'> & { categoryIds?: string[] };

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
  const { activeColors } = useCustomerColors();
  const { activeCategories } = useCustomerCategories();
  const [customerName, setCustomerName] = useState(initialValues?.customerName || initialValues?.name || '');
  const [mobileNo, setMobileNo] = useState(initialValues?.mobileNo || initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [address, setAddress] = useState(initialValues?.address || '');
  const [dob, setDob] = useState(initialValues?.dob || '');
  const [remark, setRemark] = useState(initialValues?.remark || '');
  const [colorId, setColorId] = useState(initialValues?.colorId || '');
  const [categoryIds, setCategoryIds] = useState<string[]>(initialValues?.categoryIds || []);
  const [validationError, setValidationError] = useState('');
  const hasUserSelectedColor = useRef(false);
  const selectedColor = useMemo(() => (
    activeColors.find((colorOption) => colorOption.id === colorId) || null
  ), [activeColors, colorId]);

  useEffect(() => {
    if (hasUserSelectedColor.current || colorId || !initialValues?.color) return;

    const matchedColor = activeColors.find((colorOption) => (
      colorOption.hexCode.toLowerCase() === initialValues.color?.toLowerCase()
    ));

    if (matchedColor) setColorId(matchedColor.id);
  }, [activeColors, colorId, initialValues?.color]);

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
      dob: dob.trim() || undefined,
      remark: remark.trim() || null,
      colorId: selectedColor?.id || null,
      color: selectedColor?.hexCode || null,
      status: initialValues?.status || 'Active',
      joinedDate: initialValues?.joinedDate || new Date().toISOString().split('T')[0],
      addedDate: initialValues?.addedDate,
      updatedDate: initialValues?.updatedDate,
      categoryIds,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">{entityLabel}</p>
          <h3 className="h5 fw-semibold mb-1">
            {initialValues ? `Update ${entityLabel.toLowerCase()} profile` : `Create ${entityLabel.toLowerCase()} profile`}
          </h3>
          <p className="page-muted small mb-0">
            Customer profiles power transaction selection, contact details, and follow-up visibility.
          </p>
        </div>
      </div>

      {validationError ? (
        <div className="form-alert" role="alert">{validationError}</div>
      ) : null}

      <div className="form-section-card mb-4">
        <div className="form-section-title">Contact Details</div>
        <div className="row g-3">
          {initialValues?.customerCode ? (
            <div className="col-12 col-md-6">
              <Input
                label="Customer Code"
                value={initialValues.customerCode}
                disabled
                readOnly
              />
            </div>
          ) : null}
          <div className="col-12 col-md-6">
            <Input
              label="Customer Name"
              placeholder="Example: Riya Sharma"
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); setValidationError(''); }}
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
              onChange={(e) => { setMobileNo(e.target.value); setValidationError(''); }}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div className="col-12">
            <Input
              label="Address"
              placeholder="Customer address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Remark</label>
            <textarea
              className="form-control styled-textarea"
              rows={3}
              placeholder="Optional note"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Customer Color</div>
        <p className="page-muted small mb-3">
          Assign a color from Color Master. The customer name will appear in this color across tables and workflows.
        </p>
        <label className="form-label" htmlFor="customer-color">Customer Color</label>
        <select
          id="customer-color"
          className="form-select"
          value={colorId}
          onChange={(event) => {
            hasUserSelectedColor.current = true;
            setColorId(event.target.value);
          }}
        >
          <option value="">Default text color</option>
          {activeColors.map((colorOption) => (
            <option key={colorOption.id} value={colorOption.id}>
              ● {colorOption.name}
            </option>
          ))}
        </select>
        {selectedColor ? (
          <div className="customer-color-picker__preview mt-2">
            <span className="color-master-cell__swatch" style={{ backgroundColor: selectedColor.hexCode }} />
            <span style={{ color: selectedColor.hexCode, fontWeight: 600 }}>{customerName || 'Customer Name'}</span>
            <span className="page-muted small ms-2">Preview</span>
          </div>
        ) : null}
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Customer Categories</div>
        <p className="page-muted small mb-3">
          Assign one or more categories to group this customer.
        </p>
        {activeCategories.length === 0 ? (
          <p className="page-muted small">No categories available. Add categories in Customer Category Master first.</p>
        ) : (
          <div className="row g-2">
            {activeCategories.map((cat) => {
              const isChecked = categoryIds.includes(cat.id);
              return (
                <div key={cat.id} className="col-12 col-md-6">
                  <label className="form-check-label d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isChecked}
                      onChange={() => {
                        setCategoryIds((prev) =>
                          isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                        );
                      }}
                    />
                    {cat.name}
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Cancel</button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default CustomerForm;
