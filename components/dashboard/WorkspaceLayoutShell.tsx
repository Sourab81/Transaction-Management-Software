'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredUser, logoutUser, updateStoredUser, type SessionUser } from '../../lib/auth-session';
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

const WorkspaceLayoutShell = ({ children }: WorkspaceLayoutShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const routeState = useMemo(() => resolveWorkspaceRouteState(pathname), [pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const user = getStoredUser();

      if (!user) {
        setCurrentUser(null);
        setIsCheckingSession(false);
        router.replace(LOGIN_ROUTE);
        return;
      }

      setCurrentUser(user);
      setIsCheckingSession(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [router]);

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

  if (isCheckingSession) {
    return <AppLoadingScreen />;
  }

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
