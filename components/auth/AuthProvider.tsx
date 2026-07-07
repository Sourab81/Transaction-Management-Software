'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { restoreAuthToken, getStoredAuthToken } from '../../lib/api/direct-backend';
import { getStoredUser } from '../../lib/auth-session';
import AppLoadingScreen from '../layout/AppLoadingScreen';

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isLoading: true,
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    restoreAuthToken().then((token) => {
      if (token) {
        setIsAuthenticated(true);
      } else {
        // Check if user session exists (already logged in from localStorage-based flow)
        const user = getStoredUser();
        setIsAuthenticated(!!user);
      }
    }).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <AppLoadingScreen
        eyebrow="Restoring Session"
        title="Loading eNest"
        copy="Restoring your session and loading workspace data."
      />
    );
  }

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
