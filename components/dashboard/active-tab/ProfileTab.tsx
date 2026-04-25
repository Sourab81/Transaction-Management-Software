'use client';

import { useEffect, useState } from 'react';
import { FaLock, FaSignOutAlt } from 'react-icons/fa';
import { getBusinessSubscriptionPlan } from '../../../lib/subscription';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import ErrorState from '../../ui/state/ErrorState';
import type { DashboardTabContext } from './types';

interface ProfileTabProps {
  ctx: DashboardTabContext;
}

export default function ProfileTab({ ctx }: ProfileTabProps) {
  const {
    currentRole,
    currentUser,
    currentBusinessProfile,
    currentEmployeeProfile,
    employeeAssignedDepartment,
    getRoleLabel,
    handleLogout,
    handleAdminProfileSave,
    handleBusinessProfileSave,
    handleEmployeeProfileSave,
  } = ctx;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (currentRole === 'Admin') {
      setName(currentUser.name);
      setPhone('');
      setEmail(currentUser.email);
      setPassword('');
      setShowPassword(false);
      return;
    }

    if (currentRole === 'Customer' && currentBusinessProfile) {
      setName(currentBusinessProfile.name);
      setPhone(currentBusinessProfile.phone);
      setEmail(currentBusinessProfile.email);
      setPassword('');
      setShowPassword(false);
      return;
    }

    if (currentRole === 'Employee' && currentEmployeeProfile) {
      setName(currentEmployeeProfile.name);
      setPhone(currentEmployeeProfile.phone);
      setEmail(currentEmployeeProfile.email);
      setPassword('');
      setShowPassword(false);
    }
  }, [currentBusinessProfile, currentEmployeeProfile, currentRole, currentUser.email, currentUser.name]);

  if (currentRole === 'Customer' && !currentBusinessProfile) {
    return (
      <div className="row g-4">
        <div className="col-12">
          <section className="panel p-4">
            <ErrorState
              title="Business profile is unavailable"
              description="Refresh the workspace and reopen Profile to load your business details."
            />
          </section>
        </div>
      </div>
    );
  }

  if (currentRole === 'Employee' && !currentEmployeeProfile) {
    return (
      <div className="row g-4">
        <div className="col-12">
          <section className="panel p-4">
            <ErrorState
              title="Employee profile is unavailable"
              description="Refresh the workspace and reopen Profile to load your employee details."
            />
          </section>
        </div>
      </div>
    );
  }

  const roleLabel = getRoleLabel(currentRole);
  const currentStatus = currentRole === 'Customer'
    ? currentBusinessProfile?.status || 'Active'
    : currentRole === 'Employee'
      ? currentEmployeeProfile?.status || 'Active'
      : 'Active';
  const currentJoinedDate = currentRole === 'Customer'
    ? currentBusinessProfile?.joinedDate || 'Not available'
    : currentRole === 'Employee'
      ? currentEmployeeProfile?.joinedDate || 'Not available'
      : 'Platform administrator';
  const customerPlanLabel = currentBusinessProfile?.subscription
    ? getBusinessSubscriptionPlan(currentBusinessProfile.subscription.planId).label
    : 'Not assigned';
  const profileTitle = currentRole === 'Customer'
    ? currentBusinessProfile?.name || currentUser.name
    : currentRole === 'Employee'
      ? currentEmployeeProfile?.name || currentUser.name
      : currentUser.name;
  const profileDescription = currentRole === 'Customer'
    ? 'Manage the details used for business login and workspace display.'
    : currentRole === 'Employee'
      ? 'Manage the details used for employee login and workspace display.'
      : 'Manage the admin profile details returned by your backend session.';
  const summaryRows = currentRole === 'Customer'
    ? [
        ['Email Address', currentBusinessProfile?.email || currentUser.email],
        ['Phone Number', currentBusinessProfile?.phone || 'Not added'],
        ['Subscription Plan', customerPlanLabel],
        ['Joined Date', currentJoinedDate],
      ]
    : currentRole === 'Employee'
      ? [
          ['Email Address', currentEmployeeProfile?.email || currentUser.email],
          ['Phone Number', currentEmployeeProfile?.phone || 'Not added'],
          ['Department', employeeAssignedDepartment?.name || 'Not assigned'],
          ['Joined Date', currentJoinedDate],
        ]
      : [
          ['Email Address', currentUser.email],
          ['Workspace Role', roleLabel],
          ['Access Scope', 'Platform-wide administration'],
        ];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (currentRole === 'Admin') {
      handleAdminProfileSave({
        name: trimmedName,
        email: trimmedEmail,
      });
      return;
    }

    const trimmedPhone = phone.trim();

    if (currentRole === 'Customer') {
      handleBusinessProfileSave({
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        password: trimmedPassword || undefined,
      });
      return;
    }

    handleEmployeeProfileSave({
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      password: trimmedPassword || undefined,
    });
  };

  return (
    <div className="row g-4 profile-shell">
      <div className="col-12 col-xl-8">
        <section className="panel p-4 profile-panel">
          <div className="profile-panel__header">
            <div className="profile-panel__intro">
              <p className="eyebrow">Account Details</p>
              <h2 className="panel-title">{profileTitle}</h2>
              <p className="page-muted mb-0">{profileDescription}</p>
            </div>
            <div className="profile-panel__chips">
              <span className="status-chip status-chip--info">{roleLabel}</span>
              <span className={`status-chip ${currentStatus === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                {currentStatus}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className={currentRole === 'Admin' ? 'col-12' : 'col-12 col-md-6'}>
                <Input
                  label={currentRole === 'Customer' ? 'Business Name' : 'Full Name'}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              {currentRole === 'Admin' ? null : (
                <div className="col-12 col-md-6">
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className={currentRole === 'Admin' ? 'col-12' : 'col-12 col-md-6'}>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              {currentRole === 'Admin' ? null : (
                <div className="col-12 col-md-6">
                  <div className="app-field">
                    <label className="form-label">Password</label>
                    <div className="password-field">
                      <input
                        className="form-control"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Leave blank to keep the current password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="form-hint">Leave this empty if you do not want to change your current password.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions profile-form__actions">
              <Button type="submit">Save Profile</Button>
            </div>
          </form>
        </section>
      </div>

      <div className="col-12 col-xl-4">
        <section className="panel p-4 profile-sidebar">
          <div className="profile-sidebar__section">
            <p className="eyebrow">Current Summary</p>
            <h3 className="h5 fw-semibold mb-0">Account snapshot</h3>

            <div className="profile-summary-list">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="profile-summary-item">
                  <span className="profile-summary-label">{label}</span>
                  <span className="profile-summary-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-sidebar__section profile-sidebar__section--logout">
            <p className="eyebrow">Session Control</p>
            <h3 className="h5 fw-semibold mb-2">Logout</h3>
            <p className="page-muted mb-3">
              End the current local session and return to the login screen.
            </p>
            <Button type="button" variant="danger" className="profile-logout-button" onClick={handleLogout}>
              <FaSignOutAlt />
              Logout
            </Button>
            {currentRole === 'Admin' ? null : (
              <div className="profile-security-note">
                <FaLock />
                <span>Password changes apply to your next login as well.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
