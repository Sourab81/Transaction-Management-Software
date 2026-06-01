'use client';

import ServiceForm from '../../forms/ServiceForm';
import PermissionState from '../../ui/state/PermissionState';
import type { DashboardTabContext } from './types';

interface TransactionsTabProps {
  ctx: DashboardTabContext;
}

export default function TransactionsTab({ ctx }: TransactionsTabProps) {
  const {
    currentRole,
    canManageModule,
    accounts,
    visibleCustomers,
    visibleServices,
    availableCounters,
    workflowDraft,
    selectedCounter,
    currentUser,
    displayUserName,
    getRoleLabel,
    reloadCustomers,
    reloadTransactions,
    reloadAccounts,
    reloadCustomerBalance,
    reloadDepartments,
    setTransactionDraftDirty,
  } = ctx;

  const reloadAfterTransactionCreate = () => {
    reloadTransactions();
    reloadCustomerBalance();
    reloadAccounts();
    reloadDepartments();
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <section className="panel p-4">
          <div className="form-section-title mb-1">Transactions</div>
          <p className="page-muted mb-0">Add customer transaction details.</p>
        </section>
      </div>

      <div id="service-workflow" className="col-12">
        {canManageModule('transactions') && !selectedCounter ? (
          <PermissionState
            eyebrow="Transaction Workflow"
            title="Please select department first."
            description="Choose a department from the topbar before creating transactions or loading service/product inventory."
          />
        ) : canManageModule('transactions') ? (
          <ServiceForm
            key={`${workflowDraft?.token || 'service-workflow-form'}:${selectedCounter?.id || 'no-department'}`}
            accounts={accounts}
            availableDepartments={availableCounters}
            businessId={currentUser.businessId || ''}
            customers={visibleCustomers}
            selectedDepartment={selectedCounter}
            services={visibleServices}
            actor={{
              id: currentUser.id,
              name: displayUserName,
              role: currentRole === 'Employee' ? 'Employee' : 'Customer',
            }}
            draft={workflowDraft}
            onCustomersChanged={reloadCustomers}
            onTransactionsChanged={reloadAfterTransactionCreate}
            onDirtyChange={setTransactionDraftDirty}
          />
        ) : (
          <PermissionState
            eyebrow="Transaction Workflow"
            title="Transaction entry is restricted"
            description={`${getRoleLabel(currentRole)} can view allowed information, but cannot create inventory transactions.`}
          />
        )}
      </div>
    </div>
  );
}
