'use client';

import Link from 'next/link';
import { FaPlusCircle } from 'react-icons/fa';
import { getCustomerWorkspaceViewUi, getModuleUi } from '../../../lib/module-ui';
import { customerPermissionOptions } from '../../../lib/platform-structure';
import { getCustomerWorkspacePath } from '../../../lib/workspace-routes';
import EmptyState from '../../ui/state/EmptyState';
import ErrorState from '../../ui/state/ErrorState';
import PermissionState from '../../ui/state/PermissionState';
import SectionHero from '../SectionHero';
import CustomersTable from '../../tables/CustomersTable';
import CustomerPaymentsTable from '../../tables/CustomerPaymentsTable';
import CustomerOutstandingTable from '../../tables/CustomerOutstandingTable';
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
    filteredBusinesses,
    businesses,
    businessPermissionFilter,
    setBusinessPermissionFilter,
    businessPermissionFilterLabel,
    isBusinessDirectoryLoading,
    businessDirectoryError,
    customerDirectoryPagination,
  } = ctx;
  const customerModuleUi = getModuleUi('customers');
  const customerViewUi = getCustomerWorkspaceViewUi(customerPageView);
  const emptyAction = canAddCustomerRecords
    ? {
        label: `Add ${customerEntityLabel}`,
        onClick: () => handleQuickAction('add-customer'),
      }
    : undefined;
  const adminDirectoryEmptyTitle = businessPermissionFilter === 'all'
    ? 'No business records yet'
    : 'No businesses match this permission filter';
  const adminDirectoryEmptyDescription = businessPermissionFilter === 'all'
    ? 'Create a business workspace to start managing directory records from this screen.'
    : `Try a different permission filter or clear ${businessPermissionFilterLabel}.`;
  const isAdminBusinessDirectoryLoading = currentRole === 'Admin' && isBusinessDirectoryLoading;
  const adminBusinessDirectoryError = currentRole === 'Admin' ? businessDirectoryError : '';

  return (
    <div className="row g-4">
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

      {currentRole === 'Admin' ? (
        <div className="col-12">
          <section className="panel department-toolbar">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Business Filters</p>
                <h2 className="panel-title">Filter businesses by permission</h2>
                <p className="panel-copy">See which business logins were granted a specific permission before you edit access.</p>
              </div>
              <div className="panel-status-chip">
                Showing {filteredBusinesses.length} of {customerDirectoryPagination?.totalRecords ?? businesses.length}
              </div>
            </div>
            <div className="department-toolbar__grid">
              <div className="app-field mb-0">
                <label className="form-label">Permission</label>
                <select
                  className="form-select"
                  value={businessPermissionFilter}
                  onChange={(event) => setBusinessPermissionFilter(event.target.value)}
                >
                  <option value="all">All permissions</option>
                  {customerPermissionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="department-toolbar__actions">
                <button
                  type="button"
                  className="btn-app btn-app-secondary"
                  onClick={() => setBusinessPermissionFilter('all')}
                  disabled={businessPermissionFilter === 'all'}
                >
                  Clear Filter
                </button>
              </div>
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
                onView={currentRole === 'Admin' ? undefined : handleViewCustomerHistory}
                onEdit={canEditCustomerRecords ? handleEditCustomer : undefined}
                onDelete={canDeleteCustomerRecords ? (id: string) => handleDeleteRecord(currentRole === 'Admin' ? 'DELETE_BUSINESS' : 'DELETE_CUSTOMER', id) : undefined}
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
