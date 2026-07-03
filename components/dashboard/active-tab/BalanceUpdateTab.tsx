'use client';

import AccountsComingSoonTab from './AccountsComingSoonTab';
import type { DashboardTabContext } from './types';

export default function BalanceUpdateTab({ ctx }: { ctx: DashboardTabContext }) {
  return <AccountsComingSoonTab ctx={ctx} title="Balance Update" />;
}
