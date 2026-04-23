import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import DepartmentsTab from '../../../components/dashboard/active-tab/DepartmentsTab';

export default function DepartmentsPage() {
  return <WorkspaceModulePage activeTab="departments" ContentComponent={DepartmentsTab} />;
}
