import React, { useState } from 'react';
import {
  businessSubscriptionPlans,
  calculateBusinessSubscriptionEndDate,
  createBusinessSubscription,
  getBusinessSubscriptionPlan,
  type BusinessSubscription,
  type BusinessSubscriptionPlanId,
} from '../../lib/subscription';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface SubscriptionPlanFormProps {
  initialSubscription?: BusinessSubscription;
  submitLabel: string;
  statusLabel?: string;
  onCancel: () => void;
  onSubmit: (subscription: BusinessSubscription) => void;
  onCancelPlan?: () => void;
}

const SubscriptionPlanForm: React.FC<SubscriptionPlanFormProps> = ({
  initialSubscription,
  submitLabel,
  statusLabel,
  onCancel,
  onSubmit,
  onCancelPlan,
}) => {
  const [planId, setPlanId] = useState<BusinessSubscriptionPlanId>(initialSubscription?.planId || 'trial-1-week');
  const [startDate, setStartDate] = useState(initialSubscription?.startDate || new Date().toISOString().split('T')[0]);
  const selectedPlan = getBusinessSubscriptionPlan(planId);
  const previewEndDate = calculateBusinessSubscriptionEndDate(planId, startDate);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(createBusinessSubscription(planId, startDate));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">Your Plan</p>
          <h3 className="h5 fw-semibold mb-1">Manage subscription access</h3>
          <p className="page-muted small mb-0">Switch, renew, or restart the subscription plan used by this business workspace.</p>
        </div>
        <span className="status-chip status-chip--info">{statusLabel || selectedPlan.label}</span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Plan Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Plan"
              value={planId}
              onChange={(event) => setPlanId(event.target.value as BusinessSubscriptionPlanId)}
              options={businessSubscriptionPlans.map((plan) => ({
                value: plan.id,
                label: `${plan.label} (${plan.durationLabel})`,
              }))}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Plan Start Date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>
          <div className="col-12">
            <div className="subscription-plan-preview">
              <div>
                <p className="subscription-plan-preview__label">{selectedPlan.label}</p>
                <p className="page-muted small mb-0">{selectedPlan.description}</p>
              </div>
              <div className="subscription-plan-preview__meta">
                <span>Duration: {selectedPlan.durationLabel}</span>
                <span>Ends: {previewEndDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Close</button>
        {onCancelPlan ? (
          <button type="button" className="btn-app btn-app-danger" onClick={onCancelPlan}>Cancel Plan</button>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default SubscriptionPlanForm;
