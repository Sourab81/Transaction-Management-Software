'use client';

import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import ReportsTab from '../../../components/dashboard/active-tab/ReportsTab';

export default function ReportsPage() {
  return <WorkspaceModulePage activeTab="reports" ContentComponent={ReportsTab} />;
}
