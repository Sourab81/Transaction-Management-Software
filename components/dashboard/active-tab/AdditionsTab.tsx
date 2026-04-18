'use client';

import SectionHero from '../SectionHero';
import AdditionsTable from '../../tables/AdditionsTable';
import { FaCog } from 'react-icons/fa';
import type { DashboardTabContext } from './types';

interface AdditionsTabProps {
  ctx: DashboardTabContext;
}

export default function AdditionsTab({ ctx }: AdditionsTabProps) {
  const {
    additionOptions,
    canManageModule,
    canDeleteModule,
    handleConfigureOption,
    handleDeleteRecord,
    handleQuickAction,
  } = ctx;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Configuration Options"
          title="Fine tune system behavior"
          description="Use these advanced controls to update rules, reports, and integration settings."
          action={canManageModule('additions') ? {
            label: 'Manage Options',
            icon: <FaCog />,
            onClick: () => handleQuickAction('update-options'),
          } : undefined}
        />
      </div>

      <div className="col-12">
        <AdditionsTable
          options={additionOptions}
          onConfigure={canManageModule('additions') ? handleConfigureOption : undefined}
          onDelete={canDeleteModule('additions') ? (id: string) => handleDeleteRecord('DELETE_ADDITION_OPTION', id) : undefined}
        />
      </div>
    </div>
  );
}
