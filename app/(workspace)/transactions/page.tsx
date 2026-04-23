import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import TransactionsTab from '../../../components/dashboard/active-tab/TransactionsTab';

export default function TransactionsPage() {
  return <WorkspaceModulePage activeTab="transactions" ContentComponent={TransactionsTab} />;
}
