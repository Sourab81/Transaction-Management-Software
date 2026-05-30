import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import TransactionsListTab from '../../../../components/dashboard/active-tab/TransactionsListTab';

export default function TransactionsListPage() {
  return <WorkspaceModulePage activeTab="transactions" transactionPageView="list" ContentComponent={TransactionsListTab} />;
}
