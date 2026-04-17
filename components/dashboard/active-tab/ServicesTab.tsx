'use client';

import SectionHero from '../SectionHero';
import ServicesTable from '../../tables/ServicesTable';
import { FaPlusCircle } from 'react-icons/fa';

interface ServicesTabProps {
  ctx: any;
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
        <ServicesTable
          services={visibleServices}
          onEdit={canManageModule('services') ? handleEditService : undefined}
          onDelete={canDeleteModule('services') ? (id: string) => handleDeleteRecord('DELETE_SERVICE', id) : undefined}
        />
      </div>
    </div>
  );
}
