'use client';

import React, { useState } from 'react';
import { FaLock, FaUser, FaUserShield, FaUserTie } from 'react-icons/fa';
import { getAvailableUsers, loginWithDummyCredentials, type LoginRole, type SessionUser } from '../../lib/auth-session';
import { getRoleLabel, type UserRole } from '../../lib/platform-structure';

interface LoginScreenProps {
  onLoginSuccess: (user: SessionUser) => void;
}

const roleOptions: Array<{
  role: LoginRole;
  label: string;
  helper: string;
  icon: React.ReactNode;
}> = [
  {
    role: 'Admin',
    label: 'Admin',
    helper: 'Focused access to dashboard, customers, reminder, reports, and admin controls.',
    icon: <FaUserShield />,
  },
  {
    role: 'Customer',
    label: 'Business',
    helper: 'Access to dashboard, customers, employee, services, account, reports, expense, and department switching.',
    icon: <FaUser />,
  },
  {
    role: 'Employee',
    label: 'Employee',
    helper: 'Operational access to dashboard, customers, reminder, services, account, reports, and live workflows.',
    icon: <FaUserTie />,
  },
];

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const availableUsers = getAvailableUsers();
  const getRoleUser = (role: LoginRole) => availableUsers.find((user) => user.role === role);
  const defaultRole = 'Admin' as LoginRole;
  const defaultUser = getRoleUser(defaultRole);
  const [selectedRole, setSelectedRole] = useState<LoginRole>(defaultRole);
  const [email, setEmail] = useState(defaultUser?.email || '');
  const [password, setPassword] = useState(defaultUser?.password || '');
  const [error, setError] = useState('');
  const selectedRoleLabel = getRoleLabel(selectedRole as UserRole);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const user = loginWithDummyCredentials(selectedRole, email, password);

    if (!user) {
      setError(`Invalid ${selectedRoleLabel.toLowerCase()} credentials. Please use one of the available accounts below.`);
      return;
    }

    onLoginSuccess(user);
  };

  const handleRoleChange = (role: LoginRole) => {
    const roleUser = getRoleUser(role);
    setSelectedRole(role);
    setEmail(roleUser?.email || '');
    setPassword(roleUser?.password || '');
    setError('');
  };

  const activeRoleUser = getRoleUser(selectedRole);

  return (
    <main className="auth-shell">
      <div className="auth-grid">
        <section className="auth-card auth-card--accent">
          <p className="eyebrow">eNest Platform</p>
          <h1 className="auth-heading">One login screen, three role-based entry points.</h1>
          <p className="auth-copy">
            Choose whether you are signing in as an admin, business, or employee, then continue into the same streamlined workspace.
          </p>

          <div className="auth-metrics">
            <div className="auth-metric">
              <strong>3</strong>
              <span>Active login roles</span>
            </div>
            <div className="auth-metric">
              <strong>1</strong>
              <span>Single entry screen</span>
            </div>
            <div className="auth-metric">
              <strong>Live</strong>
              <span>Local session demo</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <p className="eyebrow">Secure Entry</p>
          <h2 className="h3 fw-semibold mt-2 mb-2">Login to your dashboard</h2>
          <p className="page-muted mb-4">Select a role first, then sign in with the matching credentials.</p>

          <div className="auth-demo-list mb-4">
            {roleOptions.map((option) => (
              <button
                key={option.role}
                type="button"
                className={`auth-demo-card ${selectedRole === option.role ? 'is-active' : ''}`}
                onClick={() => handleRoleChange(option.role)}
              >
                <span className="auth-demo-card__icon">{option.icon}</span>
                <span>
                  <span className="fw-semibold d-block">{option.label}</span>
                  <span className="small page-muted d-block">{option.helper}</span>
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="app-field mb-3">
              <label className="form-label">Role</label>
              <input type="text" className="form-control" value={selectedRoleLabel} readOnly />
            </div>

            <div className="app-field mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
              />
            </div>

            <div className="app-field mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
            </div>

            {error ? <div className="form-alert">{error}</div> : null}

            <button type="submit" className="btn-app btn-app-primary w-100">
              <FaLock />
              Login as {selectedRoleLabel}
            </button>
          </form>

          <div className="auth-note">
            {activeRoleUser
              ? `${selectedRole === 'Employee' ? 'Assigned employee account' : `${selectedRoleLabel} account`} ready for login: ${activeRoleUser.email}`
              : `No active ${selectedRoleLabel.toLowerCase()} account is assigned yet.`}
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginScreen;
