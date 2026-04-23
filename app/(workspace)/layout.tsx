import type { ReactNode } from 'react';
import WorkspaceLayoutShell from '../../components/dashboard/WorkspaceLayoutShell';
import { getInitialWorkspaceData } from '../../lib/api/workspace-initial-data';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const initialWorkspaceData = await getInitialWorkspaceData();

  return (
    <WorkspaceLayoutShell initialWorkspaceData={initialWorkspaceData}>
      {children}
    </WorkspaceLayoutShell>
  );
}
