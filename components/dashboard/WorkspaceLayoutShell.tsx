'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logoutUser, updateStoredUser, type SessionUser } from '../../lib/auth-session';
import type { WorkspaceInitialData } from '../../lib/api/workspace-initial-data';
import { canAccessModuleForSession } from '../../lib/platform-structure';
import {
  DEFAULT_WORKSPACE_MODULE_ID,
  LOGIN_ROUTE,
  getWorkspaceModulePath,
  isCustomerWorkspaceView,
  isWorkspaceModuleId,
  type CustomerWorkspaceView,
} from '../../lib/workspace-routes';
import AppLoadingScreen from '../layout/AppLoadingScreen';
import Dashboard from './Dashboard';

interface WorkspaceLayoutShellProps {
  children: ReactNode;
  initialUser: SessionUser;
  initialWorkspaceData?: WorkspaceInitialData;
}

interface WorkspaceRouteState {
  activeTab: string;
  customerPageView: CustomerWorkspaceView;
}

const resolveWorkspaceRouteState = (pathname: string): WorkspaceRouteState => {
  const segments = pathname.split('/').filter(Boolean);
  const [moduleId, nestedSegment] = segments;

  if (moduleId === 'customers' && nestedSegment && isCustomerWorkspaceView(nestedSegment)) {
    return {
      activeTab: 'customers',
      customerPageView: nestedSegment,
    };
  }

  if (moduleId && isWorkspaceModuleId(moduleId)) {
    return {
      activeTab: moduleId,
      customerPageView: 'list',
    };
  }

  return {
    activeTab: DEFAULT_WORKSPACE_MODULE_ID,
    customerPageView: 'list',
  };
};

const WorkspaceLayoutShell = ({
  children,
  initialUser,
  initialWorkspaceData,
}: WorkspaceLayoutShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(initialUser);
  const routeState = useMemo(() => resolveWorkspaceRouteState(pathname), [pathname]);

  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  const routeAccessContext = useMemo(
    () => currentUser
      ? {
          role: currentUser.role,
          businessId: currentUser.businessId,
          permissions: currentUser.permissions,
        }
      : null,
    [currentUser],
  );
  const canOpenActiveRoute = routeAccessContext
    ? canAccessModuleForSession(routeAccessContext, routeState.activeTab)
    : false;

  useEffect(() => {
    if (!currentUser || canOpenActiveRoute || routeState.activeTab === DEFAULT_WORKSPACE_MODULE_ID) {
      return;
    }

    router.replace(getWorkspaceModulePath(DEFAULT_WORKSPACE_MODULE_ID));
  }, [canOpenActiveRoute, currentUser, routeState.activeTab, router]);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    router.replace(LOGIN_ROUTE);
  };

  const handleSessionUserChange = (user: SessionUser) => {
    updateStoredUser(user);
    setCurrentUser(user);
  };

  const handleNavigate = (moduleId: string) => {
    const nextPath = getWorkspaceModulePath(moduleId);

    if (pathname !== nextPath) {
      router.push(nextPath);
    }
  };

  if (!currentUser) {
    return (
      <AppLoadingScreen
        eyebrow="Redirecting"
        title="Returning to Login"
        copy="This workspace route requires an active session."
      />
    );
  }

  if (!canOpenActiveRoute) {
    return (
      <AppLoadingScreen
        eyebrow="Access Restricted"
        title="Opening Dashboard"
        copy="Your current permissions do not allow this workspace page."
      />
    );
  }

  return (
    <Dashboard
      currentUser={currentUser}
      initialWorkspaceData={initialWorkspaceData}
      onLogout={handleLogout}
      onSessionUserChange={handleSessionUserChange}
      activeTab={routeState.activeTab}
      customerPageView={routeState.customerPageView}
      onNavigate={handleNavigate}
    >
      {children}
    </Dashboard>
  );
};

export default WorkspaceLayoutShell;
