import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import TransactionsTab from '../../../../components/dashboard/active-tab/TransactionsTab';

export default function AddTransactionPage() {
  return <WorkspaceModulePage activeTab="transactions" transactionPageView="add" ContentComponent={TransactionsTab} />;
}
