'use client';

import EmptyState from '../../ui/state/EmptyState';
import SectionHero from '../SectionHero';
import type { DashboardTabContext } from './types';

interface AccountsComingSoonTabProps {
  ctx: DashboardTabContext;
  title: string;
}

export default function AccountsComingSoonTab({ title }: AccountsComingSoonTabProps) {
  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Accounts"
          title={title}
          description="This accounts workflow will be available soon."
        />
      </div>
      <div className="col-12">
        <EmptyState
          eyebrow="Accounts"
          title="Coming Soon"
          description="This page is not available yet."
        />
      </div>
    </div>
  );
}
