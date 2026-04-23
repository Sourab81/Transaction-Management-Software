import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import AccountsTab from '../../../components/dashboard/active-tab/AccountsTab';

export default function AccountsPage() {
  return <WorkspaceModulePage activeTab="accounts" ContentComponent={AccountsTab} />;
}
