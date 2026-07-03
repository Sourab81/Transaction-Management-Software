import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import BalanceUpdateTab from '../../../../components/dashboard/active-tab/BalanceUpdateTab';

export default function BalanceUpdatePage() {
  return <WorkspaceModulePage activeTab="accounts" ContentComponent={BalanceUpdateTab} />;
}
