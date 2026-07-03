import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import CashDepositTab from '../../../../components/dashboard/active-tab/CashDepositTab';

export default function CashDepositPage() {
  return <WorkspaceModulePage activeTab="accounts" ContentComponent={CashDepositTab} />;
}
