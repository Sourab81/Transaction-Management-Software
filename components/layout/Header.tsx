'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaBars, FaBell, FaEllipsisV, FaSearch, FaUser } from 'react-icons/fa';
import { getCustomerWorkspaceViewUi, getModuleLabel } from '../../lib/module-ui';
import { getModuleDisplayById, getRoleLabel, type UserRole } from '../../lib/platform-structure';
import type { CustomerWorkspaceView } from '../../lib/workspace-routes';
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
  customerPageView?: CustomerWorkspaceView;
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
  onCounterChange: (counterId: string) => void;
  onSearch: (query: string) => void;
  onProfileOpen: () => void;
  onNotificationsClick: () => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  customerPageView,
  counters,
  selectedCounterId,
  notificationCount,
  searchValue,
  currentUser,
  onCounterChange,
  onSearch,
  onProfileOpen,
  onNotificationsClick,
  isSidebarOpen,
  onSidebarToggle,
}) => {
  const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);
  const [isCompactSearchOpen, setIsCompactSearchOpen] = useState(false);
  const currentModule = getModuleDisplayById(activeTab, currentUser.role);
  const headerTitle = activeTab === 'customers' && customerPageView
    ? getCustomerWorkspaceViewUi(customerPageView).label
    : getModuleLabel(activeTab) || currentModule?.label || 'Dashboard';
  const roleLabel = getRoleLabel(currentUser.role);
  const showDepartmentSelector = (currentUser.role === 'Customer' || currentUser.role === 'Employee') && counters.length > 0;
  const showMissingDepartmentState = currentUser.role === 'Employee' && counters.length === 0;
  const isDepartmentLocked = currentUser.role === 'Employee';
  const headerRef = useRef<HTMLElement | null>(null);
  const compactSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsCompactMenuOpen(false);
    setIsCompactSearchOpen(false);
  }, [activeTab, customerPageView]);

  useEffect(() => {
    if (isCompactSearchOpen) {
      compactSearchInputRef.current?.focus();
    }
  }, [isCompactSearchOpen]);

  useEffect(() => {
    if (!isCompactMenuOpen && !isCompactSearchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setIsCompactMenuOpen(false);
        setIsCompactSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCompactMenuOpen(false);
        setIsCompactSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCompactMenuOpen, isCompactSearchOpen]);

  const handleProfileOpen = () => {
    setIsCompactMenuOpen(false);
    setIsCompactSearchOpen(false);
    onProfileOpen();
  };

  const renderDepartmentSelector = (className?: string) => {
    if (showDepartmentSelector) {
      return (
        <div className={['header-counter', className].filter(Boolean).join(' ')}>
          <p className="header-counter__label">Department</p>
          <div className="header-counter__dropdown">
            <CounterDropdown
              counters={counters}
              selectedCounterId={selectedCounterId}
              onChange={onCounterChange}
              disabled={isDepartmentLocked}
            />
          </div>
        </div>
      );
    }

    if (showMissingDepartmentState) {
      return (
        <div className={['header-counter', 'header-counter--empty', className].filter(Boolean).join(' ')}>
          <p className="header-counter__label">Department</p>
          <div className="counter-chip">
            <span className="fw-semibold d-block">Department not assigned</span>
            <span className="page-muted small d-block mt-1">Ask the business user to assign your department.</span>
          </div>
        </div>
      );
    }

    return null;
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

          <label className="header-search header-search--desktop" aria-label="Global search">
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
            {renderDepartmentSelector()}

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
              className={`icon-button header-search-toggle ${isCompactSearchOpen ? 'is-active' : ''}`}
              aria-label="Open search"
              aria-expanded={isCompactSearchOpen}
              onClick={() => {
                setIsCompactSearchOpen((current) => {
                  const next = !current;
                  if (next) {
                    setIsCompactMenuOpen(false);
                  }
                  return next;
                });
              }}
            >
              <FaSearch size={15} />
            </button>

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
                onClick={() => {
                  setIsCompactMenuOpen((current) => {
                    const next = !current;
                    if (next) {
                      setIsCompactSearchOpen(false);
                    }
                    return next;
                  });
                }}
              >
                <FaEllipsisV size={15} />
              </button>

              {isCompactMenuOpen ? (
                <div className="header-overflow__menu">
                  {renderDepartmentSelector('header-counter--menu')}
                  {renderProfileCard('profile-card--menu')}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isCompactSearchOpen ? (
          <div className="header-search-panel">
            <label className="header-search" aria-label="Global search">
              <FaSearch className="header-search__icon" size={14} />
              <input
                ref={compactSearchInputRef}
                type="text"
                className="header-search__input"
                placeholder="Search customers, transactions, services..."
                value={searchValue}
                onChange={(event) => onSearch(event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Header;
