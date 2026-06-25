import WorkspaceModulePage from '../../../../components/dashboard/WorkspaceModulePage';
import CustomerPaymentListTab from '../../../../components/dashboard/active-tab/CustomerPaymentListTab';

export default function CustomerPaymentsPage() {
  return <WorkspaceModulePage activeTab="customers" customerPageView="payments" ContentComponent={CustomerPaymentListTab} />;
}
