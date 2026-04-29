import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import RoleTab from '../../../components/dashboard/active-tab/RoleTab';

export default function RolePage() {
  return <WorkspaceModulePage activeTab="role" ContentComponent={RoleTab} />;
}
