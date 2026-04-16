'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredUser, logoutUser, type SessionUser } from '../../lib/auth-session';
import {
  LOGIN_ROUTE,
  getWorkspaceModulePath,
  type CustomerWorkspaceView,
} from '../../lib/workspace-routes';
import AppLoadingScreen from '../layout/AppLoadingScreen';
import Dashboard from './Dashboard';

interface WorkspaceModulePageProps {
  activeTab: string;
  customerPageView?: CustomerWorkspaceView;
}

const WorkspaceModulePage = ({
  activeTab,
  customerPageView = 'list',
}: WorkspaceModulePageProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

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
      activeTab={activeTab}
      customerPageView={customerPageView}
      onNavigate={handleNavigate}
    />
  );
};

export default WorkspaceModulePage;
