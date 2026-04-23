import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import ProfileTab from '../../../components/dashboard/active-tab/ProfileTab';

export default function ProfilePage() {
  return <WorkspaceModulePage activeTab="profile" ContentComponent={ProfileTab} />;
}
