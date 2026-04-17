'use client';

import Link from 'next/link';
import SectionHero from '../SectionHero.tsx';
import CustomersTable from '../../tables/CustomersTable';
import CustomerPaymentsTable from '../../tables/CustomerPaymentsTable';
import CustomerOutstandingTable from '../../tables/CustomerOutstandingTable';
import { getCustomerWorkspacePath } from '@kspace-routes';s.ts.tss
import { FaPlusCircle } from 'react-icons/fa';

interface CustomersTabProps {
  ctx: any;
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
  } = ctx;

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
              {customerPageOptions.map((option: any) => (
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
            <CustomersTable
              customers={customerDirectoryRecords}
              eyebrow={customerEntityPlural}
              title={currentRole === 'Admin' ? 'Business directory' : 'Customer directory'}
              copy={currentRole === 'Admin'
                ? `Business records, login status, and permission access. Current filter: ${customerEntityLabel}.`
                : 'Contact details and profile status used across service workflows.'}
              entityLabel={customerEntityLabel}
              emptyLabel={`No ${customerEntityLabel.toLowerCase()} records found.`}
              onView={currentRole === 'Admin' ? undefined : handleViewCustomerHistory}
              onEdit={canEditCustomerRecords ? handleEditCustomer : undefined}
              onDelete={canDeleteCustomerRecords ? (id: string) => handleDeleteRecord(currentRole === 'Admin' ? 'DELETE_BUSINESS' : 'DELETE_CUSTOMER', id) : undefined}
            />
          ) : customerPageView === 'payments' ? (
            <CustomerPaymentsTable transactions={ctx.customerPaymentTransactions} onView={handleViewTransaction} />
          ) : (
            <CustomerOutstandingTable rows={customerOutstandingRows} onView={handleViewCustomerHistory} />
          )
        ) : (
          <section className="panel p-4">
            <p className="eyebrow mb-2">Customer Directory</p>
            <h3 className="h5 fw-semibold mb-2">Customer list access is disabled</h3>
            <p className="page-muted mb-0">
              This business can still add customers, but the customer list, payment list, and outstanding options stay hidden until those permissions are turned on.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
