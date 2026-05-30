'use client';

import type { ComponentType } from 'react';
import type { CustomerWorkspaceView, TransactionWorkspaceView } from '../../lib/workspace-routes';
import { useDashboardTabContext } from './DashboardTabContext';
import type { DashboardTabContext } from './active-tab/types';

interface WorkspaceModulePageProps {
  activeTab: string;
  customerPageView?: CustomerWorkspaceView;
  transactionPageView?: TransactionWorkspaceView;
  ContentComponent: ComponentType<{ ctx: DashboardTabContext }>;
}

const WorkspaceModulePage = ({
  ContentComponent,
}: WorkspaceModulePageProps) => {
  const ctx = useDashboardTabContext();

  return <ContentComponent ctx={ctx} />;
};

export default WorkspaceModulePage;
