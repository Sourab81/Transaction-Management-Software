import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import EmployeeTab from '../../../components/dashboard/active-tab/EmployeeTab';

export default function EmployeePage() {
  return <WorkspaceModulePage activeTab="employee" ContentComponent={EmployeeTab} />;
}
