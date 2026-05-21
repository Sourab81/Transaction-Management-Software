import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import WorkspaceLayoutShell from '../../components/dashboard/WorkspaceLayoutShell';
import { getServerSessionUser } from '../../lib/server-auth-session';
import { LOGIN_ROUTE } from '../../lib/workspace-routes';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const initialUser = await getServerSessionUser();

  if (!initialUser) {
    redirect(LOGIN_ROUTE);
  }

  return (
    <WorkspaceLayoutShell
      initialUser={initialUser}
    >
      {children}
    </WorkspaceLayoutShell>
  );
}
