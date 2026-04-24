import { redirect } from 'next/navigation';
import LoginScreen from '../../components/auth/LoginScreen';
import { getServerSessionUser } from '../../lib/server-auth-session';
import { getDefaultWorkspacePath } from '../../lib/workspace-routes';

export default async function LoginPage() {
  if (await getServerSessionUser()) {
    redirect(getDefaultWorkspacePath());
  }

  return <LoginScreen />;
}
