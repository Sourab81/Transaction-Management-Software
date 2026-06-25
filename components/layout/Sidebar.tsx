import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChevronDown, FaLayerGroup } from 'react-icons/fa';
import { getModuleLabel } from '../../lib/module-ui';
import {
  getModuleDisplay,
  getRoleLabel,
  getSidebarModulesForSession,
  type SessionAccessContext,
} from '../../lib/platform-structure';
import { getExpenseWorkspacePath, getTransactionWorkspacePath, getWorkspaceModulePath } from '../../lib/workspace-routes';

interface SidebarProps {
  activeTab: string;
  accessContext: SessionAccessContext;
  isOpen: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
}

const MASTER_MODULE_IDS = ['departments', 'services', 'accounts'];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, accessContext, isOpen, isCollapsed = false, onClose }) => {
  const visibleModules = getSidebarModulesForSession(accessContext);
  const roleLabel = getRoleLabel(accessContext.role);
  const pathname = usePathname();
  const isTransactionsRoute = activeTab === 'transactions';
  const isExpenseRoute = activeTab === 'expense';
  const isMasterRoute = MASTER_MODULE_IDS.includes(activeTab);

  const [isTransactionsMenuOpen, setIsTransactionsMenuOpen] = useState(false);
  const [isExpenseMenuOpen, setIsExpenseMenuOpen] = useState(false);
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(false);

  const isTransactionsMenuExpanded = isTransactionsRoute || isTransactionsMenuOpen;
  const isExpenseMenuExpanded = isExpenseRoute || isExpenseMenuOpen;
  const isMasterMenuExpanded = isMasterRoute || isMasterMenuOpen;

  const closeOnNavigate = () => {
    if (onClose) onClose();
  };

  const masterModules = visibleModules.filter((module) => MASTER_MODULE_IDS.includes(module.id));
  const moduleList = visibleModules.filter((module) => !MASTER_MODULE_IDS.includes(module.id));
  const masterRendered = masterModules.length > 0;

  const renderMasterDropdown = () => (
    masterRendered ? (
      <div key="master" className={`sidebar-subnav-group ${isMasterRoute ? 'is-active' : ''}`}>
        <button
          type="button"
          onClick={() => setIsMasterMenuOpen((current) => !current)}
          aria-label="Master"
          aria-expanded={isMasterMenuExpanded}
          title={isCollapsed ? 'Master' : undefined}
          className={`sidebar-link sidebar-link--parent ${isMasterRoute ? 'is-active' : ''}`}
        >
          <span className="sidebar-link__icon">
            <FaLayerGroup />
          </span>
          <span className="fw-semibold sidebar-link__label">Master</span>
          {!isCollapsed ? (
            <FaChevronDown className={`sidebar-link__chevron ${isMasterMenuExpanded ? 'is-open' : ''}`} />
          ) : null}
        </button>
        {!isCollapsed && isMasterMenuExpanded ? (
          <div className="sidebar-subnav">
            {masterModules.map((item) => {
              const displayItem = getModuleDisplay(item, accessContext.role);
              const label = displayItem.id === 'departments'
                ? 'Department'
                : displayItem.id === 'services'
                  ? 'Inventory'
                  : displayItem.id === 'accounts'
                    ? 'Account'
                    : displayItem.sidebarLabel || getModuleLabel(displayItem.id) || displayItem.label;
              return (
                <Link
                  key={displayItem.id}
                  onClick={closeOnNavigate}
                  href={getWorkspaceModulePath(displayItem.id)}
                  className={`sidebar-subnav__link ${activeTab === displayItem.id || pathname === getWorkspaceModulePath(displayItem.id) ? 'is-active' : ''}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    ) : null
  );

  return (
    <aside className={`sidebar-shell sidebar-mobile ${isOpen ? 'sidebar-open' : 'sidebar-closed'} ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand__mark">E</div>
        <div>
          <p className="sidebar-brand__title">eNest</p>
          <p className="sidebar-brand__subtitle">{roleLabel} workspace</p>
        </div>
      </div>

      <p className="sidebar-section-title">Navigation</p>

      <nav className="sidebar-nav">
        {moduleList.map((item) => {
          const displayItem = getModuleDisplay(item, accessContext.role);
          const Icon = displayItem.icon;
          const sidebarLabel = displayItem.id === 'transactions'
            ? 'Transactions'
            : displayItem.id === 'expense'
              ? 'Expenses'
              : displayItem.sidebarLabel || getModuleLabel(displayItem.id) || displayItem.label;
          const isTransactionsModule = displayItem.id === 'transactions';
          const isExpenseModule = displayItem.id === 'expense';

          if (isTransactionsModule) {
            return (
              <div key={displayItem.id} className={`sidebar-subnav-group ${isTransactionsRoute ? 'is-active' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsTransactionsMenuOpen((current) => !current)}
                  aria-label="Transactions"
                  aria-expanded={isTransactionsMenuExpanded}
                  title={isCollapsed ? sidebarLabel : undefined}
                  className={`sidebar-link sidebar-link--parent ${isTransactionsRoute ? 'is-active' : ''}`}
                >
                  <span className="sidebar-link__icon"><Icon /></span>
                  <span className="fw-semibold sidebar-link__label">{sidebarLabel}</span>
                  {!isCollapsed ? (
                    <FaChevronDown className={`sidebar-link__chevron ${isTransactionsMenuExpanded ? 'is-open' : ''}`} />
                  ) : null}
                </button>
                {!isCollapsed && isTransactionsMenuExpanded ? (
                  <div className="sidebar-subnav">
                    <Link
                      onClick={closeOnNavigate}
                      href={getTransactionWorkspacePath('add')}
                      className={`sidebar-subnav__link ${pathname === getTransactionWorkspacePath('add') || pathname === getWorkspaceModulePath('transactions') ? 'is-active' : ''}`}
                    >
                      Add Transaction
                    </Link>
                    <Link
                      onClick={closeOnNavigate}
                      href={getTransactionWorkspacePath('list')}
                      className={`sidebar-subnav__link ${pathname === getTransactionWorkspacePath('list') ? 'is-active' : ''}`}
                    >
                      Transactions List
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          }

          if (isExpenseModule) {
            return (
              <div key={displayItem.id} className={`sidebar-subnav-group ${isExpenseRoute ? 'is-active' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsExpenseMenuOpen((current) => !current)}
                  aria-label="Expenses"
                  aria-expanded={isExpenseMenuExpanded}
                  title={isCollapsed ? sidebarLabel : undefined}
                  className={`sidebar-link sidebar-link--parent ${isExpenseRoute ? 'is-active' : ''}`}
                >
                  <span className="sidebar-link__icon"><Icon /></span>
                  <span className="fw-semibold sidebar-link__label">{sidebarLabel}</span>
                  {!isCollapsed ? (
                    <FaChevronDown className={`sidebar-link__chevron ${isExpenseMenuExpanded ? 'is-open' : ''}`} />
                  ) : null}
                </button>
                {!isCollapsed && isExpenseMenuExpanded ? (
                  <div className="sidebar-subnav">
                    <Link
                      onClick={closeOnNavigate}
                      href={getExpenseWorkspacePath('list')}
                      className={`sidebar-subnav__link ${pathname === getExpenseWorkspacePath('list') || pathname === getWorkspaceModulePath('expense') || pathname === getExpenseWorkspacePath('add') ? 'is-active' : ''}`}
                    >
                      Expense List
                    </Link>
                    <Link
                      onClick={closeOnNavigate}
                      href={getExpenseWorkspacePath('categories')}
                      className={`sidebar-subnav__link ${pathname === getExpenseWorkspacePath('categories') ? 'is-active' : ''}`}
                    >
                      Expense Categories
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <React.Fragment key={displayItem.id}>
              <Link
                onClick={closeOnNavigate}
                href={getWorkspaceModulePath(displayItem.id)}
                aria-label={sidebarLabel}
                title={isCollapsed ? sidebarLabel : undefined}
                className={`sidebar-link ${activeTab === displayItem.id ? 'is-active' : ''}`}
              >
                <span className="sidebar-link__icon"><Icon /></span>
                <span className="fw-semibold sidebar-link__label">{sidebarLabel}</span>
              </Link>
              {displayItem.id === 'dashboard' ? renderMasterDropdown() : null}
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
