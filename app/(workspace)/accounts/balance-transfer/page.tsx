import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import BalanceTransferTab from '../../../../components/dashboard/active-tab/BalanceTransferTab';

export default function BalanceTransferPage() {
  return <WorkspaceModulePage activeTab="accounts" ContentComponent={BalanceTransferTab} />;
}
