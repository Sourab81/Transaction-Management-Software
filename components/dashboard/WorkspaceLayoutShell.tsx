'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logoutUser, updateStoredUser, type SessionUser } from '../../lib/auth-session';
import type { WorkspaceInitialData } from '../../lib/api/workspace-initial-data';
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
