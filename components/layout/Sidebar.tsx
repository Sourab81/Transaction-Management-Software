import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChevronDown, FaLayerGroup, FaUniversity } from 'react-icons/fa';
import { getModuleLabel } from '../../lib/module-ui';
import {
  getModuleDisplay,
  getRoleLabel,
  getSidebarModulesForSession,
  type SessionAccessContext,
} from '../../lib/platform-structure';
import {
  getAccountWorkspacePath,
  getExpenseWorkspacePath,
  getTransactionWorkspacePath,
  getWorkspaceModulePath,
} from '../../lib/workspace-routes';

interface SidebarProps {
  activeTab: string;
  accessContext: SessionAccessContext;
  isOpen: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
}

const MASTER_MODULE_IDS = ['departments', 'services', 'accounts', 'colors'];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, accessContext, isOpen, isCollapsed = false, onClose }) => {
  const visibleModules = getSidebarModulesForSession(accessContext);
  const roleLabel = getRoleLabel(accessContext.role);
  const pathname = usePathname();
  const isTransactionsRoute = activeTab === 'transactions';
  const isExpenseCategoriesRoute = pathname === getExpenseWorkspacePath('categories');
  const isExpenseRoute = activeTab === 'expense' && !isExpenseCategoriesRoute;
  const isAccountsWorkflowRoute = pathname.startsWith('/accounts/');
  const isMasterRoute = (MASTER_MODULE_IDS.includes(activeTab) && !isAccountsWorkflowRoute) || isExpenseCategoriesRoute;
  const isAccountsWorkflowVisible = visibleModules.some((module) => module.id === 'accounts');

  const [isTransactionsMenuOpen, setIsTransactionsMenuOpen] = useState(false);
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(false);
  const [isAccountsMenuOpen, setIsAccountsMenuOpen] = useState(false);

  const isTransactionsMenuExpanded = isTransactionsRoute || isTransactionsMenuOpen;
  const isMasterMenuExpanded = isMasterRoute || isMasterMenuOpen;
  const isAccountsMenuExpanded = isAccountsWorkflowRoute || isAccountsMenuOpen;

  const closeOnNavigate = () => {
    if (onClose) onClose();
  };

  const masterModules = visibleModules.filter((module) => MASTER_MODULE_IDS.includes(module.id));
  const moduleList = visibleModules.filter((module) => !MASTER_MODULE_IDS.includes(module.id));
  const canViewExpenseCategories = visibleModules.some((module) => module.id === 'expense');
  const masterRendered = masterModules.length > 0 || canViewExpenseCategories;

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
                    : displayItem.id === 'colors'
                      ? 'Colors'
                    : displayItem.sidebarLabel || getModuleLabel(displayItem.id) || displayItem.label;
              return (
                <Link
                  key={displayItem.id}
                  onClick={closeOnNavigate}
                  href={getWorkspaceModulePath(displayItem.id)}
                  className={`sidebar-subnav__link ${pathname === getWorkspaceModulePath(displayItem.id) || (activeTab === displayItem.id && !isAccountsWorkflowRoute) ? 'is-active' : ''}`}
                >
                  {label}
                </Link>
              );
            })}
            {canViewExpenseCategories ? (
              <Link
                onClick={closeOnNavigate}
                href={getExpenseWorkspacePath('categories')}
                className={`sidebar-subnav__link ${isExpenseCategoriesRoute ? 'is-active' : ''}`}
              >
                Expense Categories
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    ) : null
  );

  const renderAccountsWorkflowDropdown = () => (
    isAccountsWorkflowVisible ? (
      <div key="accounts-workflow" className={`sidebar-subnav-group ${isAccountsWorkflowRoute ? 'is-active' : ''}`}>
        <button
          type="button"
          onClick={() => setIsAccountsMenuOpen((current) => !current)}
          aria-label="Accounts"
          aria-expanded={isAccountsMenuExpanded}
          title={isCollapsed ? 'Accounts' : undefined}
          className={`sidebar-link sidebar-link--parent ${isAccountsWorkflowRoute ? 'is-active' : ''}`}
        >
          <span className="sidebar-link__icon">
            <FaUniversity />
          </span>
          <span className="fw-semibold sidebar-link__label">Accounts</span>
          {!isCollapsed ? (
            <FaChevronDown className={`sidebar-link__chevron ${isAccountsMenuExpanded ? 'is-open' : ''}`} />
          ) : null}
        </button>
        {!isCollapsed && isAccountsMenuExpanded ? (
          <div className="sidebar-subnav">
            <Link
              onClick={closeOnNavigate}
              href={getAccountWorkspacePath('cash-deposit')}
              className={`sidebar-subnav__link ${pathname === getAccountWorkspacePath('cash-deposit') ? 'is-active' : ''}`}
            >
              Cash Deposit
            </Link>
            <Link
              onClick={closeOnNavigate}
              href={getAccountWorkspacePath('balance-transfer')}
              className={`sidebar-subnav__link ${pathname === getAccountWorkspacePath('balance-transfer') ? 'is-active' : ''}`}
            >
              Balance Transfer
            </Link>
            <Link
              onClick={closeOnNavigate}
              href={getAccountWorkspacePath('balance-update')}
              className={`sidebar-subnav__link ${pathname === getAccountWorkspacePath('balance-update') ? 'is-active' : ''}`}
            >
              Balance Update
            </Link>
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
              <Link
                key={displayItem.id}
                onClick={closeOnNavigate}
                href={getExpenseWorkspacePath('list')}
                aria-label={sidebarLabel}
                title={isCollapsed ? sidebarLabel : undefined}
                className={`sidebar-link ${isExpenseRoute ? 'is-active' : ''}`}
              >
                <span className="sidebar-link__icon"><Icon /></span>
                <span className="fw-semibold sidebar-link__label">{sidebarLabel}</span>
              </Link>
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
              {displayItem.id === 'dashboard' ? renderAccountsWorkflowDropdown() : null}
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
