import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import CustomerPaymentListTab from '../../../../components/dashboard/active-tab/CustomerPaymentListTab';

export default function CustomerPaymentListPage() {
  return <WorkspaceModulePage activeTab="customers" customerPageView="payments" ContentComponent={CustomerPaymentListTab} />;
}
