'use client';

import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import DashboardTab from '../../../components/dashboard/active-tab/DashboardTab';

export default function DashboardPage() {
  return <WorkspaceModulePage activeTab="dashboard" ContentComponent={DashboardTab} />;
}
