import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import ReminderTab from '../../../components/dashboard/active-tab/ReminderTab';

export default function ReminderPage() {
  return <WorkspaceModulePage activeTab="reminder" ContentComponent={ReminderTab} />;
}
