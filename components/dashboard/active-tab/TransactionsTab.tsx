'use client';

import SectionHero from '../SectionHero';
import ServiceForm from '../../forms/ServiceForm';
import TransactionTable from '../../tables/TransactionTable';
import { FaPlusCircle, FaFilter } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import PermissionState from '../../ui/state/PermissionState';
import type { DashboardTabContext } from './types';

interface TransactionsTabProps {
  ctx: DashboardTabContext;
}

export default function TransactionsTab({ ctx }: TransactionsTabProps) {
  const {
    renderSummaryCards,
    transactionSummary,
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
    handleQuickAction,
    isTransactionFiltersOpen,
    isTransactionsLoading,
    hasActiveTransactionFilters,
    renderTransactionFilters,
    filteredTransactionRecords,
    handlePayTransaction,
    handleViewTransaction,
    setIsTransactionFiltersOpen,
    handlePrintReceipt,
    getRoleLabel,
    reloadCustomers,
    reloadTransactions,
    setTransactionDraftDirty,
  } = ctx;
  const transactionsUi = getModuleUi('transactions');
  const isShowingFilteredTransactionState = isTransactionFiltersOpen && filteredTransactionRecords.length === 0;
  const addTransactionAction = canManageModule('transactions')
    ? {
        label: 'Add Transaction',
        onClick: () => handleQuickAction('new-transaction'),
      }
    : undefined;
  const transactionFilterAction = (
    <div className="table-filter-trigger">
      <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsTransactionFiltersOpen((current) => !current)}>
        <FaFilter />
        Filter
      </button>
      {hasActiveTransactionFilters ? (
        <span className="status-chip status-chip--info">Filtered</span>
      ) : null}
    </div>
  );

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Transactions"
          title="Review recent activity"
          description="A clear view of completed, pending, and disputed payment flows."
          action={canManageModule('transactions') ? {
            label: 'Add Transaction',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('new-transaction'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(transactionSummary)}

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
            onTransactionsChanged={reloadTransactions}
            onInventoryChanged={ctx.reloadServices}
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

      {isTransactionFiltersOpen ? renderTransactionFilters() : null}

      <div className="col-12">
        {filteredTransactionRecords.length === 0 && !isTransactionsLoading ? (
          <EmptyState
            eyebrow={transactionsUi?.label}
            title={isShowingFilteredTransactionState ? 'No transactions match the current filters' : transactionsUi?.emptyTitle || 'No transaction records yet'}
            description={isShowingFilteredTransactionState
              ? 'Adjust or hide the current filters to review more transaction records.'
              : transactionsUi?.emptyDescription || 'Saved inventory transactions will appear here after they are added.'}
            action={isShowingFilteredTransactionState
              ? {
                  label: 'Hide Filters',
                  onClick: () => setIsTransactionFiltersOpen(false),
                  variant: 'secondary',
                }
              : addTransactionAction}
          />
        ) : (
          <TransactionTable
            transactions={filteredTransactionRecords}
            isLoading={isTransactionsLoading}
            onPay={handlePayTransaction}
            onView={handleViewTransaction}
            onPrint={handlePrintReceipt}
            headerAction={transactionFilterAction}
          />
        )}
      </div>
    </div>
  );
}
