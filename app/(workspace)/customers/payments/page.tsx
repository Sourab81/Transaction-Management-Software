import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import CustomersTab from '../../../../components/dashboard/active-tab/CustomersTab';

export default function CustomerPaymentsPage() {
  return <WorkspaceModulePage activeTab="customers" customerPageView="payments" ContentComponent={CustomersTab} />;
}
