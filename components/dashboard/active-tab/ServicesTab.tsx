'use client';

import SectionHero from '../SectionHero';
import ServicesTable from '../../tables/ServicesTable';
import { FaPlusCircle } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import type { DashboardTabContext } from './types';

interface ServicesTabProps {
  ctx: DashboardTabContext;
}

export default function ServicesTab({ ctx }: ServicesTabProps) {
  const {
    selectedCounter,
    visibleServices,
    canManageModule,
    canDeleteModule,
    canEmployeeOperateOnDepartment,
    handleQuickAction,
    handleEditService,
    handleDeleteRecord,
    renderSummaryCards,
    serviceSummary,
  } = ctx;
  const servicesUi = getModuleUi('services');
  const addServiceAction = canManageModule('services') && canEmployeeOperateOnDepartment
    ? {
        label: 'Add Service',
        onClick: () => handleQuickAction('add-service'),
      }
    : undefined;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Service Catalog"
          title="Manage your live services"
          description={
            selectedCounter
              ? `Track active offerings, pricing, and service status for ${selectedCounter.name}.`
              : 'Track active offerings, pricing, and service status with the latest metrics.'
          }
          action={canManageModule('services') && canEmployeeOperateOnDepartment ? {
            label: 'Add Service',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-service'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(serviceSummary)}

      <div className="col-12">
        {visibleServices.length === 0 ? (
          <EmptyState
            eyebrow={servicesUi?.label}
            title={servicesUi?.emptyTitle || 'No services available yet'}
            description={servicesUi?.emptyDescription || 'Add a service to make it available in the transaction workflow.'}
            action={addServiceAction}
          />
        ) : (
          <ServicesTable
            services={visibleServices}
            onEdit={canManageModule('services') ? handleEditService : undefined}
            onDelete={canDeleteModule('services') ? (id: string) => handleDeleteRecord('DELETE_SERVICE', id) : undefined}
          />
        )}
      </div>
    </div>
  );
}
