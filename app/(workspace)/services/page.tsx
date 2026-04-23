import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import ServicesTab from '../../../components/dashboard/active-tab/ServicesTab';

export default function ServicesPage() {
  return <WorkspaceModulePage activeTab="services" ContentComponent={ServicesTab} />;
}
