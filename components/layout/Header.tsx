import React from 'react';
import { FaBars, FaBell, FaSearch, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { getModuleDisplayById, getRoleLabel, type UserRole } from '../../lib/platform-structure';
import CounterDropdown from '../ui/CounterDropdown';

interface Counter {
  id: string;
  name: string;
  code: string;
  openingBalance: number;
  currentBalance: number;
}

interface HeaderProps {
  activeTab: string;
  counters: Counter[];
  selectedCounterId: string;
  notificationCount: number;
  searchValue: string;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    businessId?: string;
  };
  onLogout: () => void;
  onCounterChange: (counterId: string) => void;
  onSearch: (query: string) => void;
  onNotificationsClick: () => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  counters,
  selectedCounterId,
  notificationCount,
  searchValue,
  currentUser,
  onLogout,
  onCounterChange,
  onSearch,
  onNotificationsClick,
  isSidebarOpen,
  onSidebarToggle,
}) => {
  const currentModule = getModuleDisplayById(activeTab, currentUser.role);
  const heading = currentModule?.heading || 'Dashboard';
  const description = currentModule?.description || 'Overview of your workspace.';
  const roleLabel = getRoleLabel(currentUser.role);
  const showDepartmentSelector = (currentUser.role === 'Customer' || currentUser.role === 'Employee') && counters.length > 0;
  const showMissingDepartmentState = currentUser.role === 'Employee' && counters.length === 0;
  const isDepartmentLocked = currentUser.role === 'Employee';

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__title">
          <button
            type="button"
            className="icon-button mobile-menu-button"
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Toggle sidebar'}
            title="Toggle sidebar"
            onClick={onSidebarToggle}
          >
            <FaBars size={16} />
          </button>
          <div className="page-chip">E</div>
          <div className="app-header__heading">
            <p className="eyebrow">{heading}</p>
            <h1>{description}</h1>
          </div>
        </div>

        <label className="header-search" aria-label="Global search">
          <FaSearch className="header-search__icon" size={14} />
          <input
            type="text"
            className="header-search__input"
            placeholder="Search customers, transactions, services..."
            value={searchValue}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>

        <div className="app-header__actions">
          {showDepartmentSelector ? (
            <div className="header-counter">
              <p className="eyebrow mb-1">Department</p>
              <CounterDropdown
                counters={counters}
                selectedCounterId={selectedCounterId}
                onChange={onCounterChange}
                disabled={isDepartmentLocked}
              />
            </div>
          ) : null}
          {showMissingDepartmentState ? (
            <div className="header-counter">
              <p className="eyebrow mb-1">Department</p>
              <div className="counter-chip">
                <span className="fw-semibold d-block">Department not assigned</span>
                <span className="page-muted small d-block mt-1">Ask the business user to assign your department.</span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="icon-button app-header__notification"
            aria-label="Notifications"
            onClick={onNotificationsClick}
          >
            <FaBell size={16} />
            <span className="notification-badge">{notificationCount}</span>
          </button>

          <div className="profile-card">
            <div className="app-avatar">
              <FaUser size={13} />
            </div>
            <div className="profile-card__meta">
              <p className="profile-card__name">{currentUser.name}</p>
              <p className="profile-card__detail">
                <span className="profile-card__role">{roleLabel}</span>
                <span className="profile-card__separator" aria-hidden="true">|</span>
                <span className="profile-card__email">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <button type="button" className="btn-app btn-app-ghost header-logout" onClick={onLogout}>
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
