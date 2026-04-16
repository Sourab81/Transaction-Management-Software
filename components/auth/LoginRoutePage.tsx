'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginScreen from './LoginScreen';
import { getStoredUser } from '../../lib/auth-session';
import { getDefaultWorkspacePath } from '../../lib/workspace-routes';
import AppLoadingScreen from '../layout/AppLoadingScreen';

const LoginRoutePage = () => {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (getStoredUser()) {
        router.replace(getDefaultWorkspacePath());
        return;
      }

      setIsCheckingSession(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  const handleLoginSuccess = () => {
    router.replace(getDefaultWorkspacePath());
  };

  if (isCheckingSession) {
    return (
      <AppLoadingScreen
        eyebrow="Checking Access"
        title="Opening Login"
        copy="Verifying whether there is already an active eNest session."
      />
    );
  }

  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
};

export default LoginRoutePage;
