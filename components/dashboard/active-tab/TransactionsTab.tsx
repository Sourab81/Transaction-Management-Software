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
    employeeAssignedDepartment,
    canManageModule,
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
    handleViewTransaction,
    handleDeleteRecord,
    canDeleteModule,
    setIsTransactionFiltersOpen,
    canPerformModuleAction,
    handleEditTransaction,
    getRoleLabel,
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
        {currentRole === 'Employee' && !employeeAssignedDepartment ? (
          <PermissionState
            eyebrow="Service Workflow"
            title="Department assignment required"
            description="Assign this employee to a department before they can create transactions or post service payments."
          />
        ) : canManageModule('transactions') ? (
          <ServiceForm
            key={`${workflowDraft?.token || 'service-workflow-form'}:${selectedCounter?.id || 'no-department'}`}
            availableDepartments={availableCounters}
            businessId={currentUser.businessId || ''}
            selectedDepartment={selectedCounter}
            actor={{
              id: currentUser.id,
              name: displayUserName,
              role: currentRole === 'Employee' ? 'Employee' : 'Customer',
            }}
            draft={workflowDraft}
          />
        ) : (
          <PermissionState
            eyebrow="Service Workflow"
            title="Transaction entry is restricted"
            description={`${getRoleLabel(currentRole)} can view allowed information, but cannot create service transactions.`}
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
              : transactionsUi?.emptyDescription || 'Saved service transactions will appear here after they are added.'}
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
            onEdit={canPerformModuleAction('transactions', 'edit') ? handleEditTransaction : undefined}
            onView={handleViewTransaction}
            onDelete={canDeleteModule('transactions') ? (id: string) => handleDeleteRecord('DELETE_TRANSACTION', id) : undefined}
            headerAction={transactionFilterAction}
          />
        )}
      </div>
    </div>
  );
}
