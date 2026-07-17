'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { FaExchangeAlt, FaPlusCircle } from 'react-icons/fa';
import {
  createBalanceTransfer,
  type BalanceTransferMode,
} from '../../../lib/api/balanceTransfers';
import { useBalanceTransfers } from '../../../lib/hooks/useBalanceTransfers';
import ActionModal from '../../ui/ActionModal';
import SectionHero from '../SectionHero';
import BalanceTransfersTable from '../../tables/BalanceTransfersTable';
import type { DashboardTabContext } from './types';

interface BalanceTransferTabProps {
  ctx: DashboardTabContext;
}

const getTodayDateValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const getAccountLabel = (account: DashboardTabContext['accounts'][number]) =>
  `${account.bankName} - ${account.accountHolder}`;

const getDepartmentLabel = (counter: DashboardTabContext['counters'][number]) =>
  counter.code ? `${counter.name} (${counter.code})` : counter.name;

export default function BalanceTransferTab({ ctx }: BalanceTransferTabProps) {
  const {
    accounts,
    counters,
    isAccountsLoading,
    isDepartmentsLoading,
    accountsError,
    showNotification,
    reloadAccounts,
    reloadDepartments,
  } = ctx;
  const [mode, setMode] = useState<BalanceTransferMode>('department');
  const [dateFrom, setDateFrom] = useState(getTodayDateValue);
  const [dateTo, setDateTo] = useState(getTodayDateValue);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    transfers,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit,
    reload,
  } = useBalanceTransfers(true, mode, dateFrom, dateTo);

  const activeDepartments = useMemo(
    () => counters.filter((counter) => counter.status === 'Active'),
    [counters],
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'Active'),
    [accounts],
  );

  const isDepartmentMode = mode === 'department';
  const sourceLabel = isDepartmentMode ? 'Department' : 'Account';
  const fromValue = isDepartmentMode ? (ctx.selectedCounter?.id ?? '') : fromId;
  const formTitle = isDepartmentMode ? 'New Department Transfer' : 'New Account Transfer';
  const formDescription = isDepartmentMode
    ? 'Transfer balance between departments.'
    : 'Transfer balance between accounts.';
  const buttonLabel = isDepartmentMode ? 'Transfer Between Departments' : 'Transfer Between Accounts';
  const options = isDepartmentMode ? activeDepartments : activeAccounts;
  const toOptions = options.filter((option) => option.id !== fromValue);
  const isOptionsLoading = isDepartmentMode ? isDepartmentsLoading : isAccountsLoading;

  const resetForm = () => {
    setFromId('');
    setToId('');
    setAmount('');
    setRemark('');
    setValidationError('');
    setIsSubmitting(false);
  };

  const openModal = () => {
    setValidationError('');
    if (!isDepartmentMode) setFromId('');
    setToId('');
    setAmount('');
    setRemark('');
    setIsTransferModalOpen(true);
  };

  const closeModal = () => {
    setIsTransferModalOpen(false);
    resetForm();
  };

  const changeMode = (nextMode: BalanceTransferMode) => {
    setMode(nextMode);
    setValidationError('');
    setFromId('');
    setToId('');
    setAmount('');
    setRemark('');
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);

    if (!fromValue || !toId) {
      setValidationError(`From ${sourceLabel.toLowerCase()} and To ${sourceLabel.toLowerCase()} are required.`);
      return;
    }

    if (fromValue === toId) {
      setValidationError(`From ${sourceLabel.toLowerCase()} and To ${sourceLabel.toLowerCase()} must be different.`);
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    const result = await createBalanceTransfer({
      mode,
      fromId: fromValue,
      toId,
      amount: parsedAmount,
      remark: remark.trim() || null,
    });

    setIsSubmitting(false);

    if (!result.success) {
      const message = result.message || 'Unable to save balance transfer.';
      setValidationError(message);
      showNotification('error', message);
      return;
    }

    showNotification('success', result.message || 'Balance transfer saved successfully.');
    closeModal();
    reload();
    reloadAccounts();
    reloadDepartments();
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="form-section-card">
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
            <div>
              <p className="eyebrow mb-1">Filter</p>
              <h3 className="table-panel__title mb-0">Balance Transfer</h3>
            </div>
            <div className="d-flex flex-wrap align-items-end gap-3">
              <div className="table-toolbar__field">
                <span>Mode</span>
                <div className="expense-source-toggle" role="group" aria-label="Transfer mode">
                  <label>
                    <input
                      className="visually-hidden"
                      type="radio"
                      name="balance-transfer-mode"
                      value="department"
                      checked={mode === 'department'}
                      onChange={() => changeMode('department')}
                    />
                    Department
                  </label>
                  <label>
                    <input
                      className="visually-hidden"
                      type="radio"
                      name="balance-transfer-mode"
                      value="account"
                      checked={mode === 'account'}
                      onChange={() => changeMode('account')}
                    />
                    Account
                  </label>
                </div>
              </div>
              <label className="table-toolbar__field">
                <span>From</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="table-toolbar__field">
                <span>To</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <BalanceTransfersTable
          transfers={transfers}
          mode={mode}
          isLoading={isLoading}
          error={error}
          pagination={{
            ...pagination,
            isLoading,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          headerAction={(
              <button
                type="button"
                className="btn-app btn-app-primary"
                onClick={openModal}
                style={!ctx.canPerformModuleAction('accounts', 'add') ? { display: 'none' } : undefined}
              >
              <FaPlusCircle />
              Transfer
            </button>
          )}
        />
        {!isDepartmentMode && accountsError ? <p className="text-danger small mt-2 mb-0">{accountsError}</p> : null}
      </div>

      {isTransferModalOpen ? (
        <ActionModal
          title={formTitle}
          eyebrow="Accounts"
          description={formDescription}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit}>
            {validationError ? (
              <div className="form-alert" role="alert">
                {validationError}
              </div>
            ) : null}

            <div className="form-section-card mb-4">
              <div className="form-section-title">Transfer Details</div>
              <div className="counter-chip mb-3">
                <p className="eyebrow mb-1">Transfer Type</p>
                <p className="fw-semibold mb-0">{buttonLabel}</p>
              </div>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">From {sourceLabel} *</label>
                  {isDepartmentMode && ctx.selectedCounter ? (
                    <div className="form-control-plaintext fw-semibold py-2">
                      {getDepartmentLabel(ctx.selectedCounter)}
                    </div>
                  ) : (
                    <select
                      id="balance-transfer-from"
                      className="form-select"
                      value={fromId}
                      onChange={(event) => {
                        setFromId(event.target.value);
                        setValidationError('');
                      }}
                      disabled={isSubmitting || isOptionsLoading}
                      required
                    >
                      <option value="">{isOptionsLoading ? `Loading ${sourceLabel.toLowerCase()}s...` : `Select ${sourceLabel}`}</option>
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {getAccountLabel(option as DashboardTabContext['accounts'][number])}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="balance-transfer-to">To {sourceLabel} *</label>
                  <select
                    id="balance-transfer-to"
                    className="form-select"
                    value={toId}
                    onChange={(event) => {
                      setToId(event.target.value);
                      setValidationError('');
                    }}
                    disabled={isSubmitting || isOptionsLoading}
                    required
                  >
                    <option value="">{isOptionsLoading ? `Loading ${sourceLabel.toLowerCase()}s...` : `Select ${sourceLabel}`}</option>
                    {toOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isDepartmentMode ? getDepartmentLabel(option as DashboardTabContext['counters'][number]) : getAccountLabel(option as DashboardTabContext['accounts'][number])}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="balance-transfer-amount">Amount *</label>
                  <input
                    id="balance-transfer-amount"
                    className="form-control"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setValidationError('');
                    }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="balance-transfer-remark">Remark</label>
                  <textarea
                    id="balance-transfer-remark"
                    className="form-control styled-textarea"
                    rows={3}
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Optional note"
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-app btn-app-secondary" onClick={closeModal} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-app btn-app-primary" disabled={isSubmitting}>
                <FaExchangeAlt />
                {isSubmitting ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
