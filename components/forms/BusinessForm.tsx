import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaSlidersH } from 'react-icons/fa';
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
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Business['status']>(initialValues?.status || 'Active');
  const joinedDate = initialValues?.joinedDate || today;
  const [permissions, setPermissions] = useState<Business['permissions']>(
    normalizeCustomerPermissions(initialValues?.permissions ?? buildDefaultCustomerPermissions())
  );
  const [planId, setPlanId] = useState<BusinessSubscriptionPlanId>(initialValues?.subscription?.planId || 'trial-1-week');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(initialValues?.subscription?.startDate || today);
  const [subscription, setSubscription] = useState<Business['subscription']>(initialValues?.subscription);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const enabledPermissionCount = Object.values(permissions).filter((enabled) => enabled === 1).length;
  const selectedPlan = getBusinessSubscriptionPlan(planId);
  const previewEndDate = calculateBusinessSubscriptionEndDate(planId, subscriptionStartDate);
  const activePlan = subscription ? getBusinessSubscriptionPlan(subscription.planId) : null;

  const togglePermission = (permissionId: string) => {
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

    const toggleItems = section.items.filter((item) => item.kind !== 'label');

    setPermissions((current) => {
      const shouldEnableAll = !toggleItems.every((item) => current[item.id] === 1);
      const nextPermissions = { ...current };

      toggleItems.forEach((item) => {
        nextPermissions[item.id] = shouldEnableAll ? 1 : 0;
      });

      return nextPermissions;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onSubmit({
      name,
      phone,
      email,
      password: password || initialValues?.password || '',
      status,
      joinedDate,
      permissions,
      subscription,
    });
  };

  const handleAddPlan = () => {
    const nextSubscription = createBusinessSubscription(planId, subscriptionStartDate);

    setSubscription(nextSubscription);
    setIsAddingPlan(false);
  };

  return (
    <form className="business-form" onSubmit={handleSubmit}>
      <div className="form-workflow-panel business-form__intro">
        <div>
          <p className="eyebrow mb-2">Business</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update business profile' : 'Create business profile'}</h3>
          <p className="page-muted small mb-0">Business profiles control login credentials, contact details, and which modules the workspace can use.</p>
        </div>
        <span className={`status-chip ${(status || 'Active') === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status || 'Active'}
        </span>
      </div>

      <div className="form-section-card business-form__section">
        <div className="business-form__section-header">
          <div>
            <div className="form-section-title mb-1">Business Details</div>
            <p className="page-muted small mb-0">Core profile, contact, login, and account status.</p>
          </div>
        </div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="Business Name" placeholder="Example: Riya Services" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input label="Phone" placeholder="Enter mobile number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Email"
              type="email"
              placeholder="business@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={Boolean(initialValues)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <div className="app-field">
              <label className="form-label">Password</label>
              <div className="password-field">
                <input
                  className="form-control"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={initialValues ? 'Enter a new password to update' : 'Create a secure password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required={!initialValues}
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
        </div>
      </div>

      <div className="form-section-card business-form__section">
        <div className="business-form__section-header">
          <div>
            <div className="form-section-title mb-1">Subscription Plan</div>
            <p className="page-muted small mb-0">Add or replace the plan this business uses to access the software.</p>
          </div>
          <div className="business-form__section-actions">
            <span className="status-chip status-chip--info">{activePlan?.label || 'No plan added'}</span>
            <button
              type="button"
              className="btn-app btn-app-secondary business-form__dropdown-button"
              aria-expanded={isAddingPlan}
              aria-controls="business-plan-editor"
              onClick={() => setIsAddingPlan((current) => !current)}
            >
              <FaPlus className="business-form__button-icon" aria-hidden="true" />
              <span>{isAddingPlan ? 'Close Plan' : subscription ? 'Change Plan' : 'Add Plan'}</span>
              {isAddingPlan ? (
                <FaChevronUp className="business-form__button-chevron" aria-hidden="true" />
              ) : (
                <FaChevronDown className="business-form__button-chevron" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {subscription ? (
          <div className="subscription-plan-preview business-form__summary">
            <div>
              <p className="subscription-plan-preview__label">{activePlan?.label}</p>
              <p className="page-muted small mb-0">{activePlan?.description}</p>
            </div>
            <div className="subscription-plan-preview__meta">
              <span>Starts: {subscription.startDate}</span>
              <span>Ends: {subscription.endDate}</span>
            </div>
          </div>
        ) : null}

        {isAddingPlan ? (
          <div className="business-form__inline-panel row g-3" id="business-plan-editor">
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
            <div className="col-12 d-flex justify-content-end">
              <Button type="button" onClick={handleAddPlan}>Add</Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="form-section-card business-form__section">
        <div className="business-form__section-header">
          <div>
            <div className="form-section-title mb-1">Menu Permissions</div>
            <p className="page-muted small mb-0">Assign the business access toggles used to unlock workspace modules after login.</p>
          </div>
          <div className="business-form__section-actions">
            <span className="status-chip status-chip--info">{enabledPermissionCount} enabled</span>
            <button
              type="button"
              className="btn-app btn-app-secondary business-form__dropdown-button"
              aria-expanded={isPermissionsOpen}
              aria-controls="business-permissions-list"
              onClick={() => setIsPermissionsOpen((current) => !current)}
            >
              <FaSlidersH className="business-form__button-icon" aria-hidden="true" />
              <span>{isPermissionsOpen ? 'Hide' : 'Permissions'}</span>
              {isPermissionsOpen ? (
                <FaChevronUp className="business-form__button-chevron" aria-hidden="true" />
              ) : (
                <FaChevronDown className="business-form__button-chevron" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {isPermissionsOpen ? (
          <div className="permission-builder business-form__permissions" id="business-permissions-list">
            {customerPermissionSections.map((section) => {
              const toggleItems = section.items.filter((item) => item.kind !== 'label');
              const enabledCount = toggleItems.filter((item) => permissions[item.id] === 1).length;
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

                      const isEnabled = permissions[item.id] === 1;

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
        ) : null}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Cancel</button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default BusinessForm;
