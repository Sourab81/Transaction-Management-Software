import React from 'react';
import Link from 'next/link';
import { getModuleLabel } from '../../lib/module-ui';
import {
  getModuleDisplay,
  getRoleLabel,
  getSidebarModulesForSession,
  type SessionAccessContext,
} from '../../lib/platform-structure';
import { getWorkspaceModulePath } from '../../lib/workspace-routes';

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
          const sidebarLabel = displayItem.sidebarLabel || getModuleLabel(displayItem.id) || displayItem.label;

          return (
            <Link
              key={displayItem.id}
              onClick={() => {
                if (onClose) onClose();
              }}
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
