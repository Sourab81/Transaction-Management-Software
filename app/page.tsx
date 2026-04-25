import { redirect } from 'next/navigation';
import { LOGIN_ROUTE } from '../lib/workspace-routes';

export default async function Home() {
  redirect(LOGIN_ROUTE);
}
