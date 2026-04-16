import React, { useState } from 'react';
import {
  buildDefaultCustomerPermissions,
  customerPermissionSections,
  normalizeCustomerPermissions,
} from '../../lib/platform-structure';
import type { Business } from '../../lib/store';
import {
  businessSubscriptionPlans,
  calculateBusinessSubscriptionEndDate,
  createBusinessSubscription,
  getBusinessSubscriptionPlan,
  type BusinessSubscriptionPlanId,
} from '../../lib/subscription';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type BusinessFormValues = Omit<Business, 'id'>;

interface BusinessFormProps {
  initialValues?: Business;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: BusinessFormValues) => void;
}

const BusinessForm: React.FC<BusinessFormProps> = ({ initialValues, submitLabel, onCancel, onSubmit }) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [password, setPassword] = useState(initialValues?.password || '');
  const [status, setStatus] = useState<Business['status']>(initialValues?.status || 'Active');
  const [joinedDate, setJoinedDate] = useState(initialValues?.joinedDate || new Date().toISOString().split('T')[0]);
  const [permissions, setPermissions] = useState<Business['permissions']>(
    normalizeCustomerPermissions(initialValues?.permissions ?? buildDefaultCustomerPermissions())
  );
  const [planId, setPlanId] = useState<BusinessSubscriptionPlanId>(initialValues?.subscription?.planId || 'trial-1-week');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(
    initialValues?.subscription?.startDate || new Date().toISOString().split('T')[0]
  );
  const [showPassword, setShowPassword] = useState(Boolean(initialValues?.password));

  const enabledPermissionCount = Object.values(permissions).filter(Boolean).length;
  const selectedPlan = getBusinessSubscriptionPlan(planId);
  const previewEndDate = calculateBusinessSubscriptionEndDate(planId, subscriptionStartDate);

  const togglePermission = (permissionId: string) => {
    setPermissions((current) => ({
      ...current,
      [permissionId]: !current[permissionId],
    }));
  };

  const toggleSectionPermissions = (sectionId: string) => {
    const section = customerPermissionSections.find((permissionSection) => permissionSection.id === sectionId);

    if (!section) {
      return;
    }

    const toggleItems = section.items.filter((item) => item.kind !== 'label');

    setPermissions((current) => {
      const shouldEnableAll = !toggleItems.every((item) => current[item.id]);
      const nextPermissions = { ...current };

      toggleItems.forEach((item) => {
        nextPermissions[item.id] = shouldEnableAll;
      });

      return nextPermissions;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextSubscription = initialValues?.subscription
      && initialValues.subscription.planId === planId
      && initialValues.subscription.startDate === subscriptionStartDate
      ? initialValues.subscription
      : createBusinessSubscription(planId, subscriptionStartDate);

    onSubmit({
      name,
      phone,
      email,
      password,
      status,
      joinedDate,
      permissions,
      subscription: nextSubscription,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">Business</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update business profile' : 'Create business profile'}</h3>
          <p className="page-muted small mb-0">Business profiles control login credentials, contact details, and which modules the workspace can use.</p>
        </div>
        <span className={`status-chip ${(status || 'Active') === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status || 'Active'}
        </span>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title">Business Details</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Business Name" placeholder="Example: Riya Services" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Phone" placeholder="Enter mobile number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Email" type="email" placeholder="business@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
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
        <div className="form-section-title">Profile Status</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Status"
              value={status || 'Active'}
              onChange={(event) => setStatus(event.target.value as Business['status'])}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Joined Date" type="date" value={joinedDate} onChange={(event) => setJoinedDate(event.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section-card mt-4">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-3">
          <div>
            <div className="form-section-title mb-1">Subscription Plan</div>
            <p className="page-muted small mb-0">Choose the dummy plan this business will use to access the software.</p>
          </div>
          <span className="status-chip status-chip--info">{selectedPlan.label}</span>
        </div>
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
              value={subscriptionStartDate}
              onChange={(event) => setSubscriptionStartDate(event.target.value)}
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
                <span>Starts: {subscriptionStartDate}</span>
                <span>Ends: {previewEndDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section-card mt-4">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-3">
          <div>
            <div className="form-section-title mb-1">Menu Permissions</div>
            <p className="page-muted small mb-0">Assign the business access toggles used to unlock workspace modules after login.</p>
          </div>
          <span className="status-chip status-chip--info">{enabledPermissionCount} enabled</span>
        </div>

        <div className="permission-builder">
          {customerPermissionSections.map((section) => {
            const toggleItems = section.items.filter((item) => item.kind !== 'label');
            const enabledCount = toggleItems.filter((item) => permissions[item.id]).length;
            const isSectionEnabled = toggleItems.length > 0 && enabledCount === toggleItems.length;

            return (
              <div key={section.id} className="permission-section">
                <div className="permission-section__header">
                  <div>
                    <h4 className="permission-section__title">{section.label}</h4>
                    <p className="permission-section__meta mb-0">{enabledCount} of {toggleItems.length} enabled</p>
                  </div>
                  <button
                    type="button"
                    className={`permission-toggle permission-toggle--section ${isSectionEnabled ? 'is-enabled' : ''}`}
                    aria-pressed={isSectionEnabled}
                    aria-label={`Toggle all ${section.label} permissions`}
                    onClick={() => toggleSectionPermissions(section.id)}
                  >
                    <span className="permission-toggle__thumb" />
                    <span className="permission-toggle__text">{isSectionEnabled ? 'On' : 'Off'}</span>
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

                    const isEnabled = permissions[item.id] ?? false;

                    return (
                      <div key={item.id} className={`permission-row ${item.indent ? 'permission-row--child' : ''}`}>
                        <span className="permission-label">{item.label}</span>
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
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Cancel</button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default BusinessForm;
