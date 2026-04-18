'use client';

import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import HistoryTab from '../../../components/dashboard/active-tab/HistoryTab';

export default function HistoryPage() {
  return <WorkspaceModulePage activeTab="history" ContentComponent={HistoryTab} />;
}
