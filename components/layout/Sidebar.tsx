import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChevronDown } from 'react-icons/fa';
import { getModuleLabel } from '../../lib/module-ui';
import {
  getModuleDisplay,
  getRoleLabel,
  getSidebarModulesForSession,
  type SessionAccessContext,
} from '../../lib/platform-structure';
import { getWorkspaceModulePath } from '../../lib/workspace-routes';
import { getTransactionWorkspacePath } from '../../lib/workspace-routes';

interface SidebarProps {
  activeTab: string;
  accessContext: SessionAccessContext;
  isOpen: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, accessContext, isOpen, isCollapsed = false, onClose }) => {
  const visibleModules = getSidebarModulesForSession(accessContext);
  const roleLabel = getRoleLabel(accessContext.role);
  const pathname = usePathname();
  const isTransactionsRoute = activeTab === 'transactions';
  const [isTransactionsMenuOpen, setIsTransactionsMenuOpen] = useState(false);
  const isTransactionsMenuExpanded = isTransactionsRoute || isTransactionsMenuOpen;
  const closeOnNavigate = () => {
    if (onClose) onClose();
  };

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
        {visibleModules.map((item) => {
          const displayItem = getModuleDisplay(item, accessContext.role);
          const Icon = displayItem.icon;
          const sidebarLabel = displayItem.id === 'transactions'
            ? 'Transactions'
            : displayItem.sidebarLabel || getModuleLabel(displayItem.id) || displayItem.label;
          const isTransactionsModule = displayItem.id === 'transactions';
          const isTransactionsActive = isTransactionsRoute;

          if (isTransactionsModule) {
            return (
              <div key={displayItem.id} className={`sidebar-subnav-group ${isTransactionsActive ? 'is-active' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsTransactionsMenuOpen((current) => !current)}
                  aria-label="Transactions"
                  aria-expanded={isTransactionsMenuExpanded}
                  title={isCollapsed ? sidebarLabel : undefined}
                  className={`sidebar-link sidebar-link--parent ${isTransactionsActive ? 'is-active' : ''}`}
                >
                  <span className="sidebar-link__icon">
                    <Icon />
                  </span>
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

          return (
            <Link
              key={displayItem.id}
              onClick={closeOnNavigate}
              href={getWorkspaceModulePath(displayItem.id)}
              aria-label={sidebarLabel}
              title={isCollapsed ? sidebarLabel : undefined}
              className={`sidebar-link ${activeTab === displayItem.id ? 'is-active' : ''}`}
            >
              <span className="sidebar-link__icon">
                <Icon />
              </span>
              <span className="fw-semibold sidebar-link__label">{sidebarLabel}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
