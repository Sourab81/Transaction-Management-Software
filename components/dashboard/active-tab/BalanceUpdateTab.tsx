'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { FaPlusCircle, FaSave } from 'react-icons/fa';
import {
  createBalanceUpdate,
  type BalanceUpdateMode,
} from '../../../lib/api/balanceUpdates';
import { useBalanceUpdates } from '../../../lib/hooks/useBalanceUpdates';
import ActionModal from '../../ui/ActionModal';
import SectionHero from '../SectionHero';
import BalanceUpdatesTable from '../../tables/BalanceUpdatesTable';
import type { DashboardTabContext } from './types';

interface BalanceUpdateTabProps {
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

export default function BalanceUpdateTab({ ctx }: BalanceUpdateTabProps) {
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
  const [mode, setMode] = useState<BalanceUpdateMode>('department');
  const [dateFrom, setDateFrom] = useState(getTodayDateValue);
  const [dateTo, setDateTo] = useState(getTodayDateValue);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [valueDate, setValueDate] = useState('');
  const [remark, setRemark] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    updates,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit,
    reload,
  } = useBalanceUpdates(true, mode, dateFrom, dateTo);

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
  const options = isDepartmentMode ? activeDepartments : activeAccounts;
  const isOptionsLoading = isDepartmentMode ? isDepartmentsLoading : isAccountsLoading;

  const selectedSource = useMemo(
    () => options.find((opt) => opt.id === sourceId) ?? null,
    [options, sourceId],
  );

  const existingBalance = selectedSource
    ? (selectedSource as DashboardTabContext['counters'][number] | DashboardTabContext['accounts'][number]).currentBalance
    : null;

  const difference = useMemo(() => {
    const statement = parseFloat(statementBalance);
    if (existingBalance !== null && Number.isFinite(existingBalance) && Number.isFinite(statement)) {
      return statement - existingBalance;
    }
    return null;
  }, [existingBalance, statementBalance]);

  const resetForm = () => {
    setSourceId('');
    setStatementBalance('');
    setValueDate('');
    setRemark('');
    setValidationError('');
    setIsSubmitting(false);
  };

  const openModal = () => {
    setValidationError('');
    resetForm();
    setIsUpdateModalOpen(true);
  };

  const closeModal = () => {
    setIsUpdateModalOpen(false);
    resetForm();
  };

  const changeMode = (nextMode: BalanceUpdateMode) => {
    setMode(nextMode);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedStatement = Number(statementBalance);

    if (!sourceId) {
      setValidationError(`${sourceLabel} is required.`);
      return;
    }

    if (existingBalance === null) {
      setValidationError('Existing balance could not be loaded.');
      return;
    }

    if (!Number.isFinite(parsedStatement)) {
      setValidationError('Statement balance is required.');
      return;
    }

    if (!remark.trim()) {
      setValidationError('Remark is required.');
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    const result = await createBalanceUpdate({
      mode,
      ...(isDepartmentMode ? { departmentId: sourceId } : { accountId: sourceId }),
      existingBalance,
      statementBalance: parsedStatement,
      valueDate: valueDate || undefined,
      remark: remark.trim(),
    });

    setIsSubmitting(false);

    if (!result.success) {
      const message = result.message || 'Unable to save balance update.';
      setValidationError(message);
      showNotification('error', message);
      return;
    }

    showNotification('success', result.message || 'Balance update saved successfully.');
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
              <h3 className="table-panel__title mb-0">Balance Update</h3>
            </div>
            <div className="d-flex flex-wrap align-items-end gap-3">
              <div className="table-toolbar__field">
                <span>Mode</span>
                <div className="expense-source-toggle" role="group" aria-label="Update mode">
                  <label>
                    <input
                      className="visually-hidden"
                      type="radio"
                      name="balance-update-mode"
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
                      name="balance-update-mode"
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
        <BalanceUpdatesTable
          updates={updates}
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
            >
              <FaPlusCircle />
              Update
            </button>
          )}
        />
        {!isDepartmentMode && accountsError ? <p className="text-danger small mt-2 mb-0">{accountsError}</p> : null}
      </div>

      {isUpdateModalOpen ? (
        <ActionModal
          title={`New ${sourceLabel} Balance Update`}
          eyebrow="Accounts"
          description={`Update the balance for a ${sourceLabel.toLowerCase()} as per statement.`}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit}>
            {validationError ? (
              <div className="form-alert" role="alert">
                {validationError}
              </div>
            ) : null}

            <div className="form-section-card mb-4">
              <div className="form-section-title">Update Details</div>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label" htmlFor="balance-update-source">{sourceLabel} *</label>
                  <select
                    id="balance-update-source"
                    className="form-select"
                    value={sourceId}
                    onChange={(event) => {
                      setSourceId(event.target.value);
                      setValidationError('');
                    }}
                    disabled={isSubmitting || isOptionsLoading}
                    required
                  >
                    <option value="">{isOptionsLoading ? `Loading ${sourceLabel.toLowerCase()}s...` : `Select ${sourceLabel}`}</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {isDepartmentMode ? getDepartmentLabel(option as DashboardTabContext['counters'][number]) : getAccountLabel(option as DashboardTabContext['accounts'][number])}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Existing Balance</label>
                  <div className="form-control-plaintext fw-semibold py-2">
                    {existingBalance !== null ? (
                      `Rs. ${existingBalance.toLocaleString('en-IN')}`
                    ) : (
                      <span className="page-muted">Select a {sourceLabel.toLowerCase()} above</span>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="balance-update-statement">Balance as per Statement *</label>
                  <input
                    id="balance-update-statement"
                    className="form-control"
                    type="number"
                    step="0.01"
                    value={statementBalance}
                    onChange={(event) => {
                      setStatementBalance(event.target.value);
                      setValidationError('');
                    }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Difference</label>
                  <div className="form-control-plaintext fw-semibold py-2">
                    {difference !== null ? (
                      <span className={difference < 0 ? 'text-danger' : difference > 0 ? 'text-success' : ''}>
                        Rs. {difference.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="page-muted">Enter balances above</span>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="balance-update-value-date">Value Date</label>
                  <input
                    id="balance-update-value-date"
                    className="form-control"
                    type="date"
                    value={valueDate}
                    onChange={(event) => setValueDate(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="balance-update-remark">Remark *</label>
                  <textarea
                    id="balance-update-remark"
                    className="form-control styled-textarea"
                    rows={3}
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Required note"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-app btn-app-secondary" onClick={closeModal} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-app btn-app-primary" disabled={isSubmitting}>
                <FaSave />
                {isSubmitting ? 'Saving...' : 'Save Update'}
              </button>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
