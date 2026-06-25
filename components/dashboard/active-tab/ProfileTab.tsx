'use client';

import { FaExchangeAlt, FaSignOutAlt } from 'react-icons/fa';
import { getBusinessSubscriptionPlan } from '../../../lib/subscription';
import Button from '../../ui/Button';
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
    getRoleLabel,
    handleLogout,
    handleOpenDepartmentPicker,
  } = ctx;

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

  const showDepartmentChange = (currentRole === 'Customer' || currentRole === 'Employee')
    && ctx.availableCounters.length > 0;
  const currentDepartmentName = ctx.selectedCounter?.name || 'Not selected';

  const profileTitle = currentRole === 'Customer'
    ? currentBusinessProfile?.name || currentUser.name
    : currentRole === 'Employee'
      ? currentEmployeeProfile?.name || currentUser.name
      : currentUser.name;

  const profileDescription = currentRole === 'Customer'
    ? 'Your business account details.'
    : currentRole === 'Employee'
      ? 'Your employee account details.'
      : 'Your admin account details.';

  const profileName = currentRole === 'Customer'
    ? currentBusinessProfile?.name || currentUser.name
    : currentRole === 'Employee'
      ? currentEmployeeProfile?.name || currentUser.name
      : currentUser.name;

  const profilePhone = currentRole === 'Customer'
    ? currentBusinessProfile?.phone || 'Not added'
    : currentRole === 'Employee'
      ? currentEmployeeProfile?.phone || 'Not added'
      : null;

  const profileEmail = currentRole === 'Customer'
    ? currentBusinessProfile?.email || currentUser.email
    : currentRole === 'Employee'
      ? currentEmployeeProfile?.email || currentUser.email
      : currentUser.email;

  const summaryRows: [string, string][] = currentRole === 'Customer'
    ? [
        ['Business Name', profileName],
        ['Email Address', profileEmail],
        ['Phone Number', profilePhone || 'Not added'],
        ['Subscription Plan', customerPlanLabel],
        ['Joined Date', currentJoinedDate],
        ['Status', currentStatus],
      ]
    : currentRole === 'Employee'
      ? [
          ['Full Name', profileName],
          ['Email Address', profileEmail],
          ['Phone Number', profilePhone || 'Not added'],
          ['Joined Date', currentJoinedDate],
          ['Status', currentStatus],
        ]
      : [
          ['Full Name', profileTitle],
          ['Email Address', profileEmail],
          ['Workspace Role', roleLabel],
          ['Access Scope', 'Platform-wide administration'],
        ];

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

          <div className="profile-summary-list mt-4">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="profile-summary-item">
                <span className="profile-summary-label">{label}</span>
                <span className="profile-summary-value">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="col-12 col-xl-4">
        <section className="panel p-4 profile-sidebar">
          {showDepartmentChange ? (
            <div className="profile-sidebar__section">
              <p className="eyebrow">Department</p>
              <h3 className="h5 fw-semibold mb-2">Current Department</h3>
              <div className="profile-summary-item mb-3">
                <span className="profile-summary-label">Selected Department</span>
                <span className="profile-summary-value">{currentDepartmentName}</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="profile-department-button"
                onClick={handleOpenDepartmentPicker}
              >
                <FaExchangeAlt />
                Change Department
              </Button>
            </div>
          ) : null}

          <div className="profile-sidebar__section profile-sidebar__section--logout">
            <p className="eyebrow">Session Control</p>
            <h3 className="h5 fw-semibold mb-2">Logout</h3>
            <p className="page-muted mb-3">
              End the current local session and return to the login screen.
            </p>
            <Button
              type="button"
              variant="danger"
              className="profile-logout-button"
              onClick={handleLogout}
            >
              <FaSignOutAlt />
              Logout
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}