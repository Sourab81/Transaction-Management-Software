import React, { useMemo, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus } from 'react-icons/fa';
import type { Business } from '../../lib/store';
import type { RoleTemplate } from '../../lib/types/role-template';
import type { CustomerPermissions } from '../../lib/permissions';
import {
  businessSubscriptionPlans,
  calculateBusinessSubscriptionEndDate,
  createBusinessSubscription,
  getBusinessSubscriptionPlan,
  type BusinessSubscriptionPlanId,
} from '../../lib/subscription';
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  phoneNumberValidationMessage,
} from '../../lib/validators/phone-validator';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export type BusinessFormValues = Omit<Business, 'id'> & {
  password?: string;
};

interface BusinessFormProps {
  initialValues?: Business;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: BusinessFormValues) => void;
  roleTemplates?: RoleTemplate[];
}

const BusinessForm: React.FC<BusinessFormProps> = ({
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
  roleTemplates = [],
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Business['status']>(initialValues?.status || 'Active');
  const [phoneError, setPhoneError] = useState('');
  const joinedDate = initialValues?.joinedDate || today;
  const [planId, setPlanId] = useState<BusinessSubscriptionPlanId>(initialValues?.subscription?.planId || 'trial-1-week');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(initialValues?.subscription?.startDate || today);
  const [subscription, setSubscription] = useState<Business['subscription']>(initialValues?.subscription);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleTemplateId, setSelectedRoleTemplateId] = useState(initialValues?.role || '');

  const selectedPlan = getBusinessSubscriptionPlan(planId);
  const previewEndDate = calculateBusinessSubscriptionEndDate(planId, subscriptionStartDate);
  const activePlan = subscription ? getBusinessSubscriptionPlan(subscription.planId) : null;

  const selectedPermissions = useMemo<CustomerPermissions | null>(() => {
    if (!selectedRoleTemplateId) return null;
    const role = roleTemplates.find((r) => r.id === selectedRoleTemplateId);
    return role?.privileges ?? null;
  }, [selectedRoleTemplateId, roleTemplates]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidPhoneNumber(phone)) {
      setPhoneError(phoneNumberValidationMessage);
      return;
    }

    onSubmit({
      name,
      phone: normalizePhoneNumber(phone),
      email,
      password: password || undefined,
      status,
      joinedDate,
      role: selectedRoleTemplateId || undefined,
      permissions: selectedPermissions || ({} as CustomerPermissions),
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
          <p className="eyebrow mb-2">User</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update user profile' : 'Create user profile'}</h3>
          <p className="page-muted small mb-0">User profiles control login credentials, contact details, and which modules the workspace can use.</p>
        </div>
        <span className={`status-chip ${(status || 'Active') === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
          {status || 'Active'}
        </span>
      </div>

      <div className="form-section-card business-form__section">
        <div className="business-form__section-header">
          <div>
            <div className="form-section-title mb-1">User Details</div>
            <p className="page-muted small mb-0">Core profile, contact, login, and account status.</p>
          </div>
        </div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Input label="User Name" placeholder="Example: Riya Services" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="col-12 col-md-6">
            <Input
              label="Phone"
              type="tel"
              inputMode="numeric"
              placeholder="Enter 10-digit mobile number"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setPhoneError('');
              }}
              error={phoneError}
              required
            />
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

          {!initialValues && roleTemplates.length > 0 ? (
            <div className="col-12 col-md-6">
              <Select
                label="Role"
                value={selectedRoleTemplateId}
                onChange={(event) => setSelectedRoleTemplateId(event.target.value)}
                options={[
                  { value: '', label: 'Select a role...' },
                  ...roleTemplates.map((role) => ({ value: role.id, label: role.roleName })),
                ]}
              />
            </div>
          ) : null}

        </div>
      </div>

      {selectedRoleTemplateId && selectedPermissions ? (
        <div className="form-section-card business-form__section">
          <div className="business-form__section-header">
            <div>
              <div className="form-section-title mb-1">Role Permissions</div>
              <p className="page-muted small mb-0">Default permissions from the selected role will be applied to this user.</p>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12">
              <div className="permission-summary">
                {Object.entries(selectedPermissions).map(([key, value]) => (
                  <span key={key} className={`permission-badge permission-badge--${value >= 1 ? (value === 2 ? 'write' : 'read') : 'none'}`}>
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

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



      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Cancel</button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default BusinessForm;
