import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import CustomersTab from '../../../components/dashboard/active-tab/CustomersTab';

export default function CustomerListPage() {
  return <WorkspaceModulePage activeTab="customers" customerPageView="list" ContentComponent={CustomersTab} />;
}
