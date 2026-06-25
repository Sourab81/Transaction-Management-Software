'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaBars, FaBell, FaEllipsisV, FaUser } from 'react-icons/fa';
import { getCustomerWorkspaceViewUi, getModuleLabel } from '../../lib/module-ui';
import { getModuleDisplayById, getRoleLabel, type UserRole } from '../../lib/platform-structure';
import type { CustomerWorkspaceView } from '../../lib/workspace-routes';

interface HeaderProps {
  activeTab: string;
  customerPageView?: CustomerWorkspaceView;
  departmentName?: string;
  notificationCount: number;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    businessId?: string;
  };
  onProfileOpen: () => void;
  onNotificationsClick: () => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  customerPageView,
  departmentName,
  notificationCount,
  currentUser,
  onProfileOpen,
  onNotificationsClick,
  isSidebarOpen,
  onSidebarToggle,
}) => {
  const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);
  const currentModule = getModuleDisplayById(activeTab, currentUser.role);
  const headerTitle = activeTab === 'customers' && currentUser.role === 'Admin'
    ? currentModule?.label || 'Businesses'
    : activeTab === 'customers' && customerPageView
    ? getCustomerWorkspaceViewUi(customerPageView).label
    : getModuleLabel(activeTab) || currentModule?.label || 'Dashboard';
  const roleLabel = getRoleLabel(currentUser.role);
  const normalizedDepartmentName = departmentName?.trim();
  const headerRef = useRef<HTMLElement | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsCompactMenuOpen(false);
  }, [activeTab, customerPageView]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isCompactMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setIsCompactMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCompactMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCompactMenuOpen]);

  const handleProfileOpen = () => {
    setIsCompactMenuOpen(false);
    onProfileOpen();
  };

  const renderProfileCard = (className?: string) => (
    <button type="button" className={['profile-card', className].filter(Boolean).join(' ')} onClick={handleProfileOpen}>
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
    </button>
  );

  return (
    <header className="app-header" ref={headerRef}>
      <div className="app-header__inner">
        <div className="app-header__bar">
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
            <div className="app-header__heading">
              <h1>{headerTitle}</h1>
            </div>
            
          </div>

          <div className="app-header__actions">
            {normalizedDepartmentName ? (
              <span className="app-header__department" aria-label={`Department: ${normalizedDepartmentName}`}>
                <span className="app-header__department-label">Department</span>
                <span className="app-header__department-name">{normalizedDepartmentName}</span>
              </span>
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

            {renderProfileCard()}
          </div>

          <div className="app-header__compact-actions">
            <button
              type="button"
              className="icon-button app-header__notification"
              aria-label="Notifications"
              onClick={onNotificationsClick}
            >
              <FaBell size={16} />
              <span className="notification-badge">{notificationCount}</span>
            </button>

            <div className="header-overflow">
              <button
                type="button"
                className={`icon-button header-overflow__toggle ${isCompactMenuOpen ? 'is-active' : ''}`}
                aria-label="Open more options"
                aria-expanded={isCompactMenuOpen}
                onClick={() => setIsCompactMenuOpen((current) => !current)}
              >
                <FaEllipsisV size={15} />
              </button>

              {isCompactMenuOpen ? (
                <div className="header-overflow__menu">
                  {renderProfileCard('profile-card--menu')}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
