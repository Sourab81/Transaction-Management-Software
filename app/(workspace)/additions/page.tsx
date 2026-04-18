'use client';

import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import AdditionsTab from '../../../components/dashboard/active-tab/AdditionsTab';

export default function AdditionsPage() {
  return <WorkspaceModulePage activeTab="additions" ContentComponent={AdditionsTab} />;
}
