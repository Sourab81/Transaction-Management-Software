import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaPlus, FaSlidersH } from 'react-icons/fa';
import {
  normalizeCustomerPermissions,
} from '../../lib/platform-structure';
import type { CustomerPermissions } from '../../lib/platform-structure';
import type { Business } from '../../lib/store';
import type { RoleTemplate } from '../../lib/types/role-template';
import { isSelectableRoleTemplate } from '../../lib/mappers/role-template-mapper';
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
import { SkeletonFormField } from '../ui/Skeleton';
import PermissionEditor from './PermissionEditor';

export type BusinessFormValues = Omit<Business, 'id'> & {
  password?: string;
  roleTemplateId?: string;
  roleTemplateBackendPrivileges?: Record<string, unknown>;
};

interface BusinessFormProps {
  initialValues?: Business;
  roleTemplates?: RoleTemplate[];
  isRoleTemplatesLoading?: boolean;
  roleTemplatesError?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: BusinessFormValues) => void;
}

const BusinessForm: React.FC<BusinessFormProps> = ({
  initialValues,
  roleTemplates = [],
  isRoleTemplatesLoading = false,
  roleTemplatesError = '',
  submitLabel,
  onCancel,
  onSubmit,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Business['status']>(initialValues?.status || 'Active');
  const [phoneError, setPhoneError] = useState('');
  const joinedDate = initialValues?.joinedDate || today;
  const [permissions, setPermissions] = useState<Business['permissions']>(
    initialValues?.permissions
      ? normalizeCustomerPermissions(initialValues.permissions)
      : ({} as CustomerPermissions)
  );
  const [planId, setPlanId] = useState<BusinessSubscriptionPlanId>(initialValues?.subscription?.planId || 'trial-1-week');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(initialValues?.subscription?.startDate || today);
  const [subscription, setSubscription] = useState<Business['subscription']>(initialValues?.subscription);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleTemplateId, setSelectedRoleTemplateId] = useState(initialValues?.roleTemplateId || '');
  const [selectedRoleTemplateBackendPrivileges, setSelectedRoleTemplateBackendPrivileges] = useState<Record<string, unknown> | undefined>();
  const [hasPermissionDraft, setHasPermissionDraft] = useState(Boolean(initialValues));

  const enabledPermissionCount = Object.values(permissions).filter((enabled) => enabled === 1).length;
  const selectedPlan = getBusinessSubscriptionPlan(planId);
  const previewEndDate = calculateBusinessSubscriptionEndDate(planId, subscriptionStartDate);
  const activePlan = subscription ? getBusinessSubscriptionPlan(subscription.planId) : null;
  const selectableRoleTemplates = roleTemplates.filter(isSelectableRoleTemplate);
  const roleSelectPlaceholder = isRoleTemplatesLoading
    ? 'Loading roles...'
    : selectableRoleTemplates.length === 0
      ? 'No active roles available'
      : 'Select role';
  const canEditPermissions = Boolean(initialValues) || hasPermissionDraft || Boolean(roleTemplatesError);

  const handleRoleTemplateChange = (roleTemplateId: string) => {
    setSelectedRoleTemplateId(roleTemplateId);

    const selectedTemplate = roleTemplates.find((roleTemplate) => roleTemplate.id === roleTemplateId);
    if (!selectedTemplate) {
      setSelectedRoleTemplateBackendPrivileges(undefined);
      setPermissions({} as CustomerPermissions);
      setHasPermissionDraft(false);
      setIsPermissionsOpen(false);
      return;
    }

    // Selecting a predefined role intentionally overwrites the current draft
    // permissions. Admin can still manually edit the toggles before saving.
    setPermissions(selectedTemplate.privileges);
    setSelectedRoleTemplateBackendPrivileges(selectedTemplate.backendPrivileges);
    setHasPermissionDraft(true);
    setIsPermissionsOpen(true);
  };

  const handleManualPermissionStart = () => {
    setSelectedRoleTemplateId('');
    setSelectedRoleTemplateBackendPrivileges(undefined);
    setPermissions({} as CustomerPermissions);
    setHasPermissionDraft(true);
    setIsPermissionsOpen(true);
  };

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
      permissions,
      subscription,
      roleTemplateId: selectedRoleTemplateId || undefined,
      selectedRoleName: selectedRoleTemplateId
        ? roleTemplates.find((roleTemplate) => roleTemplate.id === selectedRoleTemplateId)?.roleName
          || initialValues?.selectedRoleName
        : undefined,
      roleTemplateBackendPrivileges: selectedRoleTemplateBackendPrivileges,
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
          {!initialValues ? (
            <div className="col-12 col-md-6">
              {isRoleTemplatesLoading ? (
                <SkeletonFormField />
              ) : (
                <Select
                  label="Role"
                  value={selectedRoleTemplateId}
                  onChange={(event) => handleRoleTemplateChange(event.target.value)}
                  options={[
                    {
                      value: '',
                      label: roleSelectPlaceholder,
                    },
                    ...selectableRoleTemplates.map((roleTemplate) => ({
                      value: roleTemplate.id,
                      label: roleTemplate.roleName,
                    })),
                  ]}
                  disabled={selectableRoleTemplates.length === 0}
                />
              )}
              {roleTemplatesError ? (
                <div className="form-hint text-warning">
                  Unable to load roles. You can still set permissions manually.
                </div>
              ) : selectableRoleTemplates.length === 0 && !isRoleTemplatesLoading ? (
                <div className="form-hint text-warning">
                  No active roles are available for user creation.
                </div>
              ) : (
                <div className="form-hint">Selecting a role fills permissions; you can still edit them below.</div>
              )}
            </div>
          ) : null}
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
            <span className="status-chip status-chip--info">
              {canEditPermissions ? `${enabledPermissionCount} enabled` : 'No role selected'}
            </span>
            <button
              type="button"
              className="btn-app btn-app-secondary business-form__dropdown-button"
              aria-expanded={isPermissionsOpen}
              aria-controls="business-permissions-list"
              onClick={() => {
                if (!canEditPermissions) {
                  handleManualPermissionStart();
                  return;
                }

                setIsPermissionsOpen((current) => !current);
              }}
            >
              <FaSlidersH className="business-form__button-icon" aria-hidden="true" />
              <span>{isPermissionsOpen ? 'Hide' : canEditPermissions ? 'Permissions' : 'Set Manually'}</span>
              {isPermissionsOpen ? (
                <FaChevronUp className="business-form__button-chevron" aria-hidden="true" />
              ) : (
                <FaChevronDown className="business-form__button-chevron" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {!canEditPermissions ? (
          <div className="business-form__inline-panel">
            <p className="page-muted small mb-0">
              Select a role to copy its permissions, or set permissions manually. Until then, the user has no permissions enabled.
            </p>
          </div>
        ) : null}

        {isPermissionsOpen && canEditPermissions ? (
          <PermissionEditor
            permissions={permissions}
            onChange={setPermissions}
            className="business-form__permissions"
          />
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
