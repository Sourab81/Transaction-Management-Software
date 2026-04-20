'use client';

import { useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FaArrowRight,
  FaBolt,
  FaBuilding,
  FaCheckCircle,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
  FaUserShield,
  FaUserTie,
} from 'react-icons/fa';
import {
  getAvailableUsers,
  loginWithDummyCredentials,
  type AuthUser,
  type LoginRole,
  type SessionUser,
} from '../../lib/auth-session';
import { getRoleLabel, type UserRole } from '../../lib/platform-structure';
import styles from './LoginScreen.module.css';

interface LoginScreenProps {
  onLoginSuccess: (user: SessionUser) => void;
}

const roleOptions: Array<{
  role: LoginRole;
  label: string;
  eyebrow: string;
  helper: string;
  icon: IconType;
  features: string[];
}> = [
  {
    role: 'Admin',
    label: 'Admin',
    eyebrow: 'Platform control',
    helper: 'Oversee business workspaces, reporting, reminders, and access control from the top level.',
    icon: FaUserShield,
    features: [
      'Review performance across every workspace',
      'Unlock or restrict operational access',
      'Control reports, reminders, and shared settings',
    ],
  },
  {
    role: 'Customer',
    label: 'Business',
    eyebrow: 'Workspace owner',
    helper: 'Run a service center with team, department, customer, service, and account visibility in one place.',
    icon: FaBuilding,
    features: [
      'Switch departments and track live operations',
      'Manage customers, services, and team activity',
      'Review reports, accounts, and expense movement',
    ],
  },
  {
    role: 'Employee',
    label: 'Employee',
    eyebrow: 'Assigned operator',
    helper: 'Move quickly through the day-to-day service workflow with focused access to the assigned workspace.',
    icon: FaUserTie,
    features: [
      'Handle customers and in-progress service workflows',
      'Stay inside the assigned department scope',
      'Use reports and reminders needed for execution',
    ],
  },
];

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const availableUsers = getAvailableUsers();
  const defaultRole = 'Admin' as LoginRole;
  const usersByRole = useMemo(
    () =>
      roleOptions.reduce<Record<LoginRole, AuthUser[]>>((accumulator, option) => {
        accumulator[option.role] = availableUsers.filter((user) => user.role === option.role);
        return accumulator;
      }, {
        Admin: [],
        Customer: [],
        Employee: [],
      }),
    [availableUsers],
  );
  const getRoleUsers = (role: LoginRole) => usersByRole[role];
  const getRoleUser = (role: LoginRole) => getRoleUsers(role)[0];
  const defaultUser = getRoleUser(defaultRole);
  const [selectedRole, setSelectedRole] = useState<LoginRole>(defaultRole);
  const [email, setEmail] = useState(defaultUser?.email || '');
  const [password, setPassword] = useState(defaultUser?.password || '');
  const [error, setError] = useState('');
  const selectedRoleLabel = getRoleLabel(selectedRole as UserRole);
  const selectedRoleOption = roleOptions.find((option) => option.role === selectedRole) || roleOptions[0];
  const selectedRoleUsers = getRoleUsers(selectedRole);
  const activeRoleUser = selectedRoleUsers.find((user) => user.email === email.trim().toLowerCase()) || selectedRoleUsers[0] || null;
  const totalAvailableUsers = availableUsers.length;
  const SelectedRoleIcon = selectedRoleOption.icon;

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

  const handleAccountSelect = (user: AuthUser) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  };

  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <section className={styles.storyPanel}>
          <div className={styles.brandRow}>
            <span className={styles.brandBadge}>
              <span className={styles.brandMark}>E</span>
              eNest Service Console
            </span>
            <span className={styles.sessionPill}>
              <span className={styles.pulse} aria-hidden="true" />
              Local session demo
            </span>
          </div>

          <div>
            <p className="eyebrow">Unified Access</p>
            <h1 className={styles.heroTitle}>Enter the right workspace without hunting for the right portal.</h1>
            <p className={styles.heroCopy}>
              Pick a role, load an available account, and step into the same operating surface used for live dashboard,
              service, and reporting workflows.
            </p>
          </div>

          <div className={styles.storyMetrics}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Ready Accounts</span>
              <strong className={styles.metricValue}>{totalAvailableUsers}</strong>
              <p className={styles.metricCopy}>Loaded directly from the current local workspace state.</p>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Role Tracks</span>
              <strong className={styles.metricValue}>{roleOptions.length}</strong>
              <p className={styles.metricCopy}>Admin, business, and employee paths share one controlled entry.</p>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Session Type</span>
              <strong className={styles.metricValue}>Local</strong>
              <p className={styles.metricCopy}>Fast role switching for demo and QA without leaving the page.</p>
            </article>
          </div>

          <section className={styles.spotlightPanel}>
            <div className={styles.spotlightRail}>
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const roleCount = usersByRole[option.role].length;

                return (
                  <button
                    key={option.role}
                    type="button"
                    className={`${styles.spotlightRoleButton} ${selectedRole === option.role ? styles.spotlightRoleButtonActive : ''}`}
                    onClick={() => handleRoleChange(option.role)}
                    aria-pressed={selectedRole === option.role}
                  >
                    <span className={styles.spotlightRoleIcon}>
                      <Icon />
                    </span>
                    <span>
                      <span className={styles.spotlightRoleName}>{option.label}</span>
                      <span className={styles.spotlightRoleHelper}>{option.eyebrow}</span>
                    </span>
                    <span className={styles.spotlightRoleCount}>{roleCount}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.spotlightDetail}>
              <div>
                <p className={styles.spotlightEyebrow}>{selectedRoleOption.eyebrow}</p>
                <h2 className={styles.spotlightTitle}>{selectedRoleOption.label} access map</h2>
                <p className={styles.spotlightCopy}>{selectedRoleOption.helper}</p>

                <ul className={styles.spotlightFeatures}>
                  {selectedRoleOption.features.map((feature) => (
                    <li key={feature} className={styles.spotlightFeature}>
                      <span className={styles.spotlightFeatureIcon}>
                        <FaCheckCircle />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.spotlightMeta}>
                <span className={styles.spotlightMetaChip}>{selectedRoleUsers.length} account(s) available now</span>
                <span className={styles.spotlightMetaChip}>Preset credentials can be edited before sign-in</span>
              </div>
            </div>
          </section>
        </section>

        <section className={styles.authPanel}>
          <header className={styles.authHeader}>
            <p className={styles.authKicker}>Secure Entry</p>
            <h2 className={styles.authTitle}>Login to your workspace</h2>
            <p className={styles.authCopy}>
              Choose a role, load one of the available demo accounts, then continue into the correct workspace with the
              same session flow used by the rest of the app.
            </p>
          </header>

          <div className={styles.roleTabGrid}>
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const roleCount = usersByRole[option.role].length;

              return (
                <button
                  key={option.role}
                  type="button"
                  className={`${styles.roleTab} ${selectedRole === option.role ? styles.roleTabActive : ''}`}
                  onClick={() => handleRoleChange(option.role)}
                  aria-pressed={selectedRole === option.role}
                >
                  <span className={styles.roleTabHeader}>
                    <span className={styles.roleTabIcon}>
                      <Icon />
                    </span>
                    <span className={styles.roleTabLabel}>{option.label}</span>
                    <span className={styles.roleTabCount}>{roleCount}</span>
                  </span>
                  <span className={styles.roleTabCopy}>{option.eyebrow}</span>
                </button>
              );
            })}
          </div>

          <section className={styles.selectedRoleCard} aria-label="Selected role summary">
            <div className={styles.selectedRoleIcon}>
              <SelectedRoleIcon />
            </div>
            <div>
              <span className={styles.selectedRoleLabel}>Signing in as</span>
              <h3 className={styles.selectedRoleTitle}>{selectedRoleLabel}</h3>
              <p className={styles.selectedRoleCopy}>{selectedRoleOption.helper}</p>
              <div className={styles.selectedRoleMeta}>
                <span className={styles.selectedRoleChip}>
                  <FaShieldAlt />
                  Role-aware workspace routing
                </span>
                <span className={styles.selectedRoleChip}>
                  <FaBolt />
                  First available account is preloaded
                </span>
              </div>
            </div>
          </section>

          <section className={styles.accountPanel} aria-label="Available accounts">
            <div className={styles.accountPanelHeader}>
              <div>
                <h3 className={styles.accountPanelTitle}>Available accounts for {selectedRoleOption.label}</h3>
                <p className={styles.accountPanelCopy}>
                  Click an account to load its preset credentials into the form. You can still edit them manually.
                </p>
              </div>
              <span className={styles.accountCount}>{selectedRoleUsers.length} loaded</span>
            </div>

            <div className={styles.accountList}>
              {selectedRoleUsers.length > 0 ? (
                selectedRoleUsers.map((user) => {
                  const isSelectedAccount =
                    email.trim().toLowerCase() === user.email && password === user.password;

                  return (
                    <button
                      key={`${user.role}:${user.email}`}
                      type="button"
                      className={`${styles.accountButton} ${isSelectedAccount ? styles.accountButtonActive : ''}`}
                      onClick={() => handleAccountSelect(user)}
                      aria-pressed={isSelectedAccount}
                    >
                      <span className={styles.accountIdentity}>
                        <span className={styles.accountName}>{user.name}</span>
                        <span className={styles.accountEmail}>{user.email}</span>
                      </span>
                      <span className={styles.accountMeta}>
                        <span className={styles.accountWorkspace}>
                          {user.businessId ? 'Workspace linked' : 'Core platform'}
                        </span>
                        <span className={styles.accountState}>
                          <FaCheckCircle />
                          {isSelectedAccount ? 'Loaded' : 'Tap to load'}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className={styles.accountEmpty}>
                  <strong>No {selectedRoleLabel.toLowerCase()} account is available yet.</strong>
                  <span>Add or enable a matching workspace user to make this role sign-in ready.</span>
                </div>
              )}
            </div>
          </section>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field} htmlFor="login-email">
              <span className={styles.fieldLabel}>Email</span>
              <span className={styles.fieldFrame}>
                <FaEnvelope className={styles.fieldIcon} />
                <input
                  id="login-email"
                  type="email"
                  className={styles.fieldInput}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter workspace email"
                />
              </span>
            </label>

            <label className={styles.field} htmlFor="login-password">
              <span className={styles.fieldLabel}>Password</span>
              <span className={styles.fieldFrame}>
                <FaLock className={styles.fieldIcon} />
                <input
                  id="login-password"
                  type="password"
                  className={styles.fieldInput}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                />
              </span>
            </label>

            {error ? <div className={styles.errorBanner}>{error}</div> : null}

            <button type="submit" className={styles.submitButton}>
              <FaLock />
              Login as {selectedRoleLabel}
              <FaArrowRight />
            </button>
          </form>

          <section className={styles.footnote} aria-label="Login notes">
            <div className={styles.footnoteItem}>
              <FaCheckCircle className={styles.footnoteIcon} />
              <span>
                {activeRoleUser
                  ? `Current preset is loaded for ${activeRoleUser.name} at ${activeRoleUser.email}.`
                  : `No preset is loaded because no ${selectedRoleLabel.toLowerCase()} account is currently available.`}
              </span>
            </div>
            <div className={styles.footnoteItem}>
              <FaShieldAlt className={styles.footnoteIcon} />
              <span>Sessions are stored locally. Use the Profile tab logout action to return to this screen.</span>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
};

export default LoginScreen;
