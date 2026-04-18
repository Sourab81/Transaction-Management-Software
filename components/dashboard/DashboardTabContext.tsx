'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { DashboardTabContext as DashboardTabContextValue } from './active-tab/types';

const DashboardTabContext = createContext<DashboardTabContextValue | null>(null);

interface DashboardTabContextProviderProps {
  children: ReactNode;
  value: DashboardTabContextValue;
}

export function DashboardTabContextProvider({
  children,
  value,
}: DashboardTabContextProviderProps) {
  return (
    <DashboardTabContext.Provider value={value}>
      {children}
    </DashboardTabContext.Provider>
  );
}

export function useDashboardTabContext() {
  const context = useContext(DashboardTabContext);

  if (!context) {
    throw new Error('Dashboard tab context is only available inside the workspace layout.');
  }

  return context;
}
