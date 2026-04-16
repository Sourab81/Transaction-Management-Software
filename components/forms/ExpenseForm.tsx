import React, { useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Expense } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type ExpenseFormValues = Omit<Expense, 'id'>;

interface ExpenseFormProps {
  initialValues?: Expense;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: ExpenseFormValues) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ initialValues, submitLabel, onCancel, onSubmit }) => {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [amount, setAmount] = useState(String(initialValues?.amount ?? 0));
  const [status, setStatus] = useState<Expense['status']>(initialValues?.status || 'Active');
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseNonNegativeNumber(amount);

    if (parsedAmount === null) {
      setValidationError('Amount must be a valid zero or positive number.');
      return;
    }

    setValidationError('');
    onSubmit({
      title,
      category,
      amount: parsedAmount,
      status,
      date,
      notes,
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
          <p className="eyebrow mb-2">Expense</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update expense entry' : 'Create expense entry'}</h3>
          <p className="page-muted small mb-0">Track outgoing business costs with a clear amount, category, and status.</p>
        </div>
        <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Expense Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Expense Title" placeholder="Example: Office Internet" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Category" placeholder="Example: Utilities" value={category} onChange={(event) => setCategory(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Amount"
              type="number"
              min="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setValidationError('');
              }}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label">Notes</label>
            <textarea className="form-control styled-textarea" rows={3} placeholder="Short note for this expense" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section-card">
        <div className="form-section-title">Status</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Expense['status'])}
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

export default ExpenseForm;
