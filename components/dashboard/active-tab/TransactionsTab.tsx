'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTransactionById } from '../../../lib/api/transactions';
import { mapTransactionDetailResponse } from '../../../lib/mappers/transaction-mapper';
import type { Transaction } from '../../../lib/store';
import ServiceForm from '../../forms/ServiceForm';
import PermissionState from '../../ui/state/PermissionState';
import type { DashboardTabContext } from './types';

interface TransactionsTabProps {
  ctx: DashboardTabContext;
}

export default function TransactionsTab({ ctx }: TransactionsTabProps) {
  const searchParams = useSearchParams();
  const editTransactionId = searchParams.get('transaction_id')?.trim() || '';
  const isEditMode = searchParams.get('mode') === 'edit' && Boolean(editTransactionId);
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
    reloadServices,
    reloadAccounts,
    reloadCustomerBalance,
    reloadDepartments,
    setTransactionDraftDirty,
    filteredTransactionRecords,
    handleCounterChange,
  } = ctx;
  const listTransaction = useMemo(
    () => filteredTransactionRecords.find(
      (transaction) => String(transaction.id) === editTransactionId,
    ) || null,
    [editTransactionId, filteredTransactionRecords],
  );
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [isEditTransactionLoading, setIsEditTransactionLoading] = useState(isEditMode);
  const [editTransactionError, setEditTransactionError] = useState('');

  useEffect(() => {
    if (!isEditMode) return;

    let isActive = true;
    void Promise.resolve().then(async () => {
      if (!isActive) return;
      setEditTransaction(listTransaction);
      setIsEditTransactionLoading(true);
      setEditTransactionError('');

      try {
        const payload = await getTransactionById(editTransactionId);
        if (!isActive) return;

        const transaction = mapTransactionDetailResponse(payload) || listTransaction;
        setEditTransaction(transaction);
        if (!transaction) {
          setEditTransactionError('Unable to load transaction details.');
        }
      } catch (error) {
        if (!isActive) return;
        setEditTransactionError(error instanceof Error ? error.message : 'Unable to load transaction details.');
      } finally {
        if (isActive) setIsEditTransactionLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [editTransactionId, isEditMode, listTransaction]);

  useEffect(() => {
    if (
      isEditMode
      && editTransaction?.departmentId
      && editTransaction.departmentId !== selectedCounter?.id
      && availableCounters.some((counter) => counter.id === editTransaction.departmentId)
    ) {
      handleCounterChange(editTransaction.departmentId);
    }
  }, [availableCounters, editTransaction, handleCounterChange, isEditMode, selectedCounter?.id]);

  const reloadAfterTransactionCreate = () => {
    reloadTransactions();
    reloadServices();
    reloadCustomerBalance();
    reloadAccounts();
    reloadDepartments();
  };

  return (
    <div className="row g-4">
      <div id="service-workflow" className="col-12">
        {isEditMode && isEditTransactionLoading ? (
          <PermissionState
            eyebrow="Transaction Workflow"
            title="Loading transaction"
            description="Loading parent and child transaction details for editing."
          />
        ) : isEditMode && editTransactionError && !editTransaction ? (
          <PermissionState
            eyebrow="Transaction Workflow"
            title="Unable to load transaction"
            description={editTransactionError}
          />
        ) : canManageModule('transactions') && !selectedCounter ? (
          <PermissionState
            eyebrow="Transaction Workflow"
            title="Please select department first."
            description="Choose a department from the topbar before creating transactions or loading service/product inventory."
          />
        ) : canManageModule('transactions') ? (
          <ServiceForm
            key={`${workflowDraft?.token || 'service-workflow-form'}:${selectedCounter?.id || 'no-department'}:${editTransaction?.id || 'add'}`}
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
            initialTransaction={isEditMode ? editTransaction : null}
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
