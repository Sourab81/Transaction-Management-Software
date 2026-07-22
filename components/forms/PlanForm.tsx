"use client";

import React, { useState } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ActionModal from '../ui/ActionModal';
import type { BusinessSubscriptionPlan, BusinessSubscriptionPlanId } from '../../lib/subscription';

interface PlanFormProps {
  mode: 'create' | 'edit';
  initialValues: BusinessSubscriptionPlan | null;
  onSave: (plan: BusinessSubscriptionPlan) => void;
  onClose: () => void;
}

export default function PlanForm({ mode, initialValues, onSave, onClose }: PlanFormProps) {
  const [id, setId] = useState(initialValues?.id || '');
  const [label, setLabel] = useState(initialValues?.label || '');
  const [durationLabel, setDurationLabel] = useState(initialValues?.durationLabel || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [isTrial, setIsTrial] = useState(initialValues?.isTrial || false);
  const [durationUnit, setDurationUnit] = useState<'days' | 'months' | 'years'>(initialValues?.duration?.unit || 'months');
  const [durationValue, setDurationValue] = useState(initialValues?.duration?.value?.toString() || '1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!id.trim()) newErrors.id = 'Plan ID is required';
    if (!label.trim()) newErrors.label = 'Label is required';
    if (!durationLabel.trim()) newErrors.durationLabel = 'Duration label is required';
    if (!durationValue.trim() || isNaN(Number(durationValue)) || Number(durationValue) < 1) {
      newErrors.durationValue = 'Must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    onSave({
      id: id.trim() as BusinessSubscriptionPlanId,
      label: label.trim(),
      durationLabel: durationLabel.trim(),
      description: description.trim(),
      isTrial,
      duration: {
        unit: durationUnit,
        value: Number(durationValue),
      },
    });
  };

  return (
    <ActionModal
      title={mode === 'create' ? 'Add Subscription Plan' : 'Edit Subscription Plan'}
      eyebrow="Subscription Plans"
      description={mode === 'create' ? 'Define a new subscription plan.' : 'Update the subscription plan details.'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-12">
            <Input
              label="Plan ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. month-1"
              readOnly={mode === 'edit'}
              error={errors.id}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 1 Month"
              error={errors.label}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Duration Label"
              value={durationLabel}
              onChange={(e) => setDurationLabel(e.target.value)}
              placeholder="e.g. 1 month"
              error={errors.durationLabel}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this plan..."
              rows={2}
            />
          </div>
          <div className="col-12 col-md-6">
            <Select
              label="Duration Unit"
              options={[
                { value: 'days', label: 'Days' },
                { value: 'months', label: 'Months' },
                { value: 'years', label: 'Years' },
              ]}
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as 'days' | 'months' | 'years')}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Duration Value"
              type="number"
              min={1}
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              error={errors.durationValue}
            />
          </div>
          <div className="col-12">
            <div className="d-flex align-items-center gap-2">
              <input
                type="checkbox"
                id="isTrial"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                className="form-check-input"
                style={{ width: '1.2rem', height: '1.2rem' }}
              />
              <label htmlFor="isTrial" className="form-label mb-0">Trial plan (free)</label>
            </div>
          </div>
          <div className="col-12 d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn-app btn-app-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-app btn-app-primary">
              {mode === 'create' ? 'Create Plan' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </ActionModal>
  );
}