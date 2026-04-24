import { redirect } from 'next/navigation';
import { getServerSessionUser } from '../lib/server-auth-session';
import { getDefaultWorkspacePath, LOGIN_ROUTE } from '../lib/workspace-routes';

export default async function Home() {
  redirect((await getServerSessionUser()) ? getDefaultWorkspacePath() : LOGIN_ROUTE);
}
