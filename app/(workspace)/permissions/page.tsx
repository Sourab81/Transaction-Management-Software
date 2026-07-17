import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import PermissionsTab from '../../../components/dashboard/active-tab/PermissionsTab';

export default function PermissionsPage() {
  return <WorkspaceModulePage activeTab="permissions" ContentComponent={PermissionsTab} />;
}
