import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import ColorMasterTab from '../../../components/dashboard/active-tab/ColorMasterTab';

export default function ColorsPage() {
  return <WorkspaceModulePage activeTab="colors" ContentComponent={ColorMasterTab} />;
}
