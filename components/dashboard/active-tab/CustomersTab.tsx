'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaFilter, FaPlusCircle } from 'react-icons/fa';
import { getCustomerWorkspaceViewUi, getModuleUi } from '../../../lib/module-ui';
import { customerPermissionOptions } from '../../../lib/platform-structure';
import { getCustomerWorkspacePath } from '../../../lib/workspace-routes';
import ActionModal from '../../ui/ActionModal';
import EmptyState from '../../ui/state/EmptyState';
import ErrorState from '../../ui/state/ErrorState';
import PermissionState from '../../ui/state/PermissionState';
import SectionHero from '../SectionHero';
import CustomersTable from '../../tables/CustomersTable';
import CustomerPaymentsTable from '../../tables/CustomerPaymentsTable';
import CustomerOutstandingTable from '../../tables/CustomerOutstandingTable';
import DataTableFilters, { type DataTableFiltersConfig } from '../../common/DataTableFilters';
import type { DashboardTabContext } from './types';

interface CustomersTabProps {
  ctx: DashboardTabContext;
}

export default function CustomersTab({ ctx }: CustomersTabProps) {
  const {
    currentRole,
    customerSectionTitle,
    customerSectionDescription,
    canAddCustomerRecords,
    customerEntityLabel,
    customerEntityPlural,
    renderSummaryCards,
    customerSummary,
    customerPageOptions,
    customerPageView,
    hasRequestedCustomerPageAccess,
    canViewCustomerRecords,
    customerDirectoryRecords,
    customerOutstandingRows,
    customerPaymentTransactions,
    handleViewCustomerHistory,
    handleEditCustomer,
    handleViewTransaction,
    canEditCustomerRecords,
    handleDeleteRecord,
    canDeleteCustomerRecords,
    renderCustomerRoutePermissionState,
    handleQuickAction,
    businessDirectoryFilters,
    setBusinessDirectoryFilters,
    businessPermissionFilterLabel,
    hasActiveBusinessDirectoryFilters,
    isBusinessDirectoryLoading,
    businessDirectoryError,
    customerDirectoryPagination,
  } = ctx;
  const [isBusinessFilterOpen, setIsBusinessFilterOpen] = useState(false);
  const [draftBusinessFilters, setDraftBusinessFilters] = useState(businessDirectoryFilters);
  const businessDirectoryFiltersConfig: DataTableFiltersConfig = {
    search: {
      enabled: true,
      fields: ['name', 'phone', 'email'],
      label: 'Search',
    },
    fields: [
      {
        field: 'permissions',
        label: 'Permissions',
        type: 'multi-select',
        options: customerPermissionOptions.map((option) => ({
          label: option.label,
          value: option.id,
        })),
      },
      {
        field: 'status',
        label: 'Status',
        type: 'single-select',
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
        ],
      },
      {
        field: 'joinedDate',
        label: 'Joined date',
        type: 'date-range',
      },
    ],
  };
  const customerModuleUi = getModuleUi('customers');
  const customerViewUi = getCustomerWorkspaceViewUi(customerPageView);
  const emptyAction = canAddCustomerRecords
    ? {
        label: `Add ${customerEntityLabel}`,
        onClick: () => handleQuickAction('add-customer'),
      }
    : undefined;
  const adminDirectoryEmptyTitle = !hasActiveBusinessDirectoryFilters
    ? 'No business records yet'
    : 'No businesses match these filters';
  const adminDirectoryEmptyDescription = !hasActiveBusinessDirectoryFilters
    ? 'Create a business workspace to start managing directory records from this screen.'
    : `Try different filters or clear ${businessPermissionFilterLabel}.`;
  const isAdminBusinessDirectoryLoading = currentRole === 'Admin' && isBusinessDirectoryLoading;
  const adminBusinessDirectoryError = currentRole === 'Admin' ? businessDirectoryError : '';
  const openBusinessFilter = () => {
    setDraftBusinessFilters(businessDirectoryFilters);
    setIsBusinessFilterOpen(true);
  };
  const applyBusinessFilter = () => {
    setBusinessDirectoryFilters(draftBusinessFilters);
    setIsBusinessFilterOpen(false);
  };
  const businessFilterAction = currentRole === 'Admin' ? (
    <div className="table-filter-trigger">
      <button type="button" className="btn-app btn-app-secondary" onClick={openBusinessFilter}>
        <FaFilter />
        Filter
      </button>
      {hasActiveBusinessDirectoryFilters ? (
        <span className="status-chip status-chip--info">{businessPermissionFilterLabel}</span>
      ) : null}
    </div>
  ) : undefined;

  return (
    <div className="row g-4">
      {isBusinessFilterOpen ? (
        <ActionModal
          title="Filter Businesses"
          eyebrow="Business Filters"
          description="Choose filters, then click Filter to update the business user list."
          onClose={() => setIsBusinessFilterOpen(false)}
        >
          <DataTableFilters
            filters={businessDirectoryFiltersConfig}
            value={draftBusinessFilters}
            onChange={setDraftBusinessFilters}
            showHeader={false}
            showFooterHint={false}
            className="table-filter-panel--modal"
          />
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsBusinessFilterOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-app btn-app-primary" onClick={applyBusinessFilter}>
              Filter
            </button>
          </div>
        </ActionModal>
      ) : null}

      <div className="col-12">
        <SectionHero
          eyebrow={currentRole === 'Admin' ? 'Business Hub' : 'Customer Hub'}
          title={customerSectionTitle}
          description={customerSectionDescription}
          action={canAddCustomerRecords ? {
            label: `Add ${customerEntityLabel}`,
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-customer'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(customerSummary)}

      {currentRole !== 'Admin' && customerPageOptions.length > 0 ? (
        <div className="col-12">
          <section className="panel p-4">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Customer Options</p>
                <h2 className="panel-title">Choose what you want to review</h2>
                <p className="panel-copy">Switch between the customer directory, payment list, and outstanding balances based on your assigned permissions.</p>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {customerPageOptions.map((option) => (
                <Link
                  key={option.id}
                  href={getCustomerWorkspacePath(option.id)}
                  className={customerPageView === option.id ? 'btn-app btn-app-primary' : 'btn-app btn-app-secondary'}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <div className="col-12">
        {!hasRequestedCustomerPageAccess ? (
          renderCustomerRoutePermissionState()
        ) : canViewCustomerRecords ? (
          currentRole === 'Admin' || customerPageView === 'list' ? (
            adminBusinessDirectoryError && customerDirectoryRecords.length === 0 ? (
              <ErrorState
                eyebrow="Business Directory"
                title="Unable to load businesses"
                description={adminBusinessDirectoryError}
              />
            ) : customerDirectoryRecords.length === 0 && !isAdminBusinessDirectoryLoading ? (
              <EmptyState
                eyebrow={currentRole === 'Admin' ? 'Business Directory' : customerModuleUi?.label}
                title={currentRole === 'Admin' ? adminDirectoryEmptyTitle : customerViewUi.emptyTitle}
                description={currentRole === 'Admin' ? adminDirectoryEmptyDescription : customerViewUi.emptyDescription}
                action={emptyAction}
              />
            ) : (
              <CustomersTable
                customers={customerDirectoryRecords}
                eyebrow={customerEntityPlural}
                title={currentRole === 'Admin' ? 'Business directory' : 'Customer directory'}
                copy={currentRole === 'Admin'
                  ? `Business records, login status, and permission access. Current filter: ${businessPermissionFilterLabel}.`
                  : 'Contact details and profile status used across service workflows.'}
                entityLabel={customerEntityLabel}
                emptyLabel={`No ${customerEntityLabel.toLowerCase()} records found.`}
                isLoading={isAdminBusinessDirectoryLoading}
                pagination={currentRole === 'Admin' ? customerDirectoryPagination : undefined}
                headerAction={businessFilterAction}
                onView={currentRole === 'Admin' ? undefined : handleViewCustomerHistory}
                onEdit={canEditCustomerRecords ? handleEditCustomer : undefined}
                onDelete={currentRole !== 'Admin' && canDeleteCustomerRecords ? (id: string) => handleDeleteRecord('DELETE_CUSTOMER', id) : undefined}
              />
            )
          ) : customerPageView === 'payments' ? (
            customerPaymentTransactions.length === 0 ? (
              <EmptyState
                eyebrow={customerModuleUi?.label}
                title={getCustomerWorkspaceViewUi('payments').emptyTitle}
                description={getCustomerWorkspaceViewUi('payments').emptyDescription}
              />
            ) : (
              <CustomerPaymentsTable transactions={customerPaymentTransactions} onView={handleViewTransaction} />
            )
          ) : (
            customerOutstandingRows.length === 0 ? (
              <EmptyState
                eyebrow={customerModuleUi?.label}
                title={getCustomerWorkspaceViewUi('outstanding').emptyTitle}
                description={getCustomerWorkspaceViewUi('outstanding').emptyDescription}
              />
            ) : (
              <CustomerOutstandingTable rows={customerOutstandingRows} onView={handleViewCustomerHistory} />
            )
          )
        ) : (
          <PermissionState
            eyebrow={customerModuleUi?.label}
            title={customerModuleUi?.permissionTitle || 'Customer access is restricted'}
            description="This business can still add customers, but the customer list, payment list, and outstanding options stay hidden until those permissions are turned on."
            action={emptyAction}
          />
        )}
      </div>
    </div>
  );
}
