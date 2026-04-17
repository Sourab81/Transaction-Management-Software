'use client';

import SectionHero from '../SectionHero';
import ServiceForm from '../../forms/ServiceForm';
import TransactionTable from '../../tables/TransactionTable';
import { FaPlusCircle } from 'react-icons/fa';

interface TransactionsTabProps {
  ctx: any;
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
    handleTransactionSubmit,
    isTransactionFiltersOpen,
    renderTransactionFilters,
    filteredTransactionRecords,
    handleViewTransaction,
    handleDeleteRecord,
    canDeleteModule,
    setIsTransactionFiltersOpen,
    canPerformModuleAction,
    handleEditTransaction,
  } = ctx;

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
          <div className="panel p-4 h-100">
            <p className="eyebrow mb-2">Service Workflow</p>
            <h3 className="h5 fw-semibold mb-2">Department assignment required</h3>
            <p className="page-muted mb-0">
              Assign this employee to a department before they can create transactions or post service payments.
            </p>
          </div>
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
          <div className="panel p-4 h-100">
            <p className="eyebrow mb-2">Service Workflow</p>
            <h3 className="h5 fw-semibold mb-2">Transaction entry is restricted</h3>
            <p className="page-muted mb-0">
              {currentRole === 'Employee' ? 'Employees can view allowed information, but cannot create service transactions.' : 'Your role can view allowed information, but cannot create service transactions.'}
            </p>
          </div>
        )}
      </div>

      {isTransactionFiltersOpen ? renderTransactionFilters() : null}

      <div className="col-12">
        <TransactionTable
          transactions={filteredTransactionRecords}
          onEdit={canPerformModuleAction('transactions', 'edit') ? handleEditTransaction : undefined}
          onView={handleViewTransaction}
          onDelete={canDeleteModule('transactions') ? (id: string) => handleDeleteRecord('DELETE_TRANSACTION', id) : undefined}
          onToggleFilters={() => setIsTransactionFiltersOpen((current: boolean) => !current)}
          isFilterOpen={isTransactionFiltersOpen}
        />
      </div>
    </div>
  );
}
