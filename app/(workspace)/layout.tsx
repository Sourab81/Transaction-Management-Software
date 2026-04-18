import type { ReactNode } from 'react';
import WorkspaceLayoutShell from '../../components/dashboard/WorkspaceLayoutShell';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceLayoutShell>{children}</WorkspaceLayoutShell>;
}
