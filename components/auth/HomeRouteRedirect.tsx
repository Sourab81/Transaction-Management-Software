'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../lib/auth-session';
import { getDefaultWorkspacePath, LOGIN_ROUTE } from '../../lib/workspace-routes';
import AppLoadingScreen from '../layout/AppLoadingScreen';

const HomeRouteRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedUser = getStoredUser();
      const nextPath = storedUser ? getDefaultWorkspacePath(storedUser.role) : LOGIN_ROUTE;
      router.replace(nextPath);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  return (
    <AppLoadingScreen
      eyebrow="Preparing Route"
      title="Opening eNest"
      copy="Checking your saved session and sending you to the right page."
    />
  );
};

export default HomeRouteRedirect;
