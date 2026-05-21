'use client';

import SectionHero from '../SectionHero';
import ServicesTable from '../../tables/ServicesTable';
import { FaPlusCircle } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import ErrorState from '../../ui/state/ErrorState';
import type { DashboardTabContext } from './types';

interface ServicesTabProps {
  ctx: DashboardTabContext;
}

export default function ServicesTab({ ctx }: ServicesTabProps) {
  const {
    selectedCounter,
    visibleServices,
    canAddServiceRecords,
    canManageModule,
    canDeleteModule,
    isServicesLoading,
    servicesError,
    canEmployeeOperateOnDepartment,
    handleQuickAction,
    handleEditService,
    handleDeleteRecord,
    renderSummaryCards,
    serviceSummary,
  } = ctx;
  const servicesUi = getModuleUi('services');
  const addServiceAction = canAddServiceRecords && canEmployeeOperateOnDepartment
    ? {
        label: 'Add Inventory',
        onClick: () => handleQuickAction('add-service'),
      }
    : undefined;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Inventory"
          title="Manage your inventory"
          description={
            selectedCounter
              ? `Track services, products, quantity, and status for ${selectedCounter.name}.`
              : 'Track services, products, quantity, and status with the latest metrics.'
          }
          action={canAddServiceRecords && canEmployeeOperateOnDepartment ? {
            label: 'Add Inventory',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-service'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(serviceSummary)}

      <div className="col-12">
        {!isServicesLoading && servicesError && visibleServices.length === 0 ? (
          <ErrorState
            eyebrow="Inventory Unavailable"
            title="Unable to load inventory"
            description={servicesError}
          />
        ) : visibleServices.length === 0 && !isServicesLoading ? (
          <EmptyState
            eyebrow={servicesUi?.label}
            title={servicesUi?.emptyTitle || 'No inventory items available yet'}
            description={servicesUi?.emptyDescription || 'Add an inventory item to make it available in the transaction workflow.'}
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
