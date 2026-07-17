'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { FaMoneyBillWave, FaPlusCircle, FaReceipt, FaSyncAlt } from 'react-icons/fa';
import { createCashDeposit } from '../../../lib/api/cashDeposits';
import { useCashDeposits } from '../../../lib/hooks/useCashDeposits';
import ActionModal from '../../ui/ActionModal';
import SectionHero from '../SectionHero';
import CashDepositsTable from '../../tables/CashDepositsTable';
import type { DashboardTabContext } from './types';
import type { SummaryCardProps } from '../SummaryCard';

interface CashDepositTabProps {
  ctx: DashboardTabContext;
}

const getTodayDateValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const getDateValue = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const offsetDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const formatMoney = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export default function CashDepositTab({ ctx }: CashDepositTabProps) {
  const {
    accounts,
    selectedCounter,
    isAccountsLoading,
    accountsError,
    renderSummaryCards,
    showNotification,
    reloadAccounts,
    reloadDepartments,
  } = ctx;
  const [dateFrom, setDateFrom] = useState(getTodayDateValue);
  const [dateTo, setDateTo] = useState(getTodayDateValue);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    deposits,
    pagination,
    isLoading,
    error,
    setPage,
    setLimit,
    reload,
  } = useCashDeposits(true, dateFrom, dateTo);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'Active'),
    [accounts],
  );

  const todaySummary = useMemo(() => {
    const today = getTodayDateValue();
    const todayDeposits = deposits.filter((deposit) => getDateValue(deposit.date) === today);

    return {
      todayDeposits: todayDeposits.length,
      todayTotalAmount: todayDeposits.reduce((total, deposit) => total + Number(deposit.amount || 0), 0),
    };
  }, [deposits]);

  const summaryCards = useMemo<SummaryCardProps[]>(() => [
    {
      title: "Today's Deposits",
      value: String(todaySummary.todayDeposits),
      detail: 'Deposits loaded for today',
      icon: <FaReceipt />,
      colorClass: 'bg-primary',
    },
    {
      title: "Today's Total Amount",
      value: formatMoney(todaySummary.todayTotalAmount),
      detail: 'Total loaded amount for today',
      icon: <FaMoneyBillWave />,
      colorClass: 'bg-success',
    },
  ], [todaySummary]);

  const resetForm = () => {
    setAccountId('');
    setAmount('');
    setRemark('');
    setValidationError('');
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setIsDepositModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);

    if (!accountId) {
      setValidationError('Bank account is required.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Amount must be greater than 0.');
      return;
    }

    if (!selectedCounter?.id) {
      setValidationError('Current department is required.');
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    const result = await createCashDeposit({
      accountId,
      amount: parsedAmount,
      departmentId: selectedCounter.id,
      remark: remark.trim() || null,
    });

    setIsSubmitting(false);

    if (!result.success) {
      const message = result.message || 'Unable to save cash deposit.';
      setValidationError(message);
      showNotification('error', message);
      return;
    }

    showNotification('success', result.message || 'Cash deposit saved successfully.');
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
              <h3 className="table-panel__title mb-0">Cash Deposit</h3>
            </div>
            <div className="d-flex flex-wrap align-items-end gap-3">
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
        <CashDepositsTable
          deposits={deposits}
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
              onClick={() => {
                setValidationError('');
                setIsDepositModalOpen(true);
              }}
              style={!ctx.canPerformModuleAction('accounts', 'add') ? { display: 'none' } : undefined}
            >
              <FaPlusCircle />
              Deposit
            </button>
          )}
        />
        {accountsError ? <p className="text-danger small mt-2 mb-0">{accountsError}</p> : null}
      </div>

      {renderSummaryCards(summaryCards)}

      {isDepositModalOpen ? (
        <ActionModal
          title="Add Cash Deposit"
          eyebrow="Accounts"
          description="Deposit departmental cash into a bank account."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit}>
            {validationError ? (
              <div className="form-alert" role="alert">
                {validationError}
              </div>
            ) : null}

            <div className="form-section-card mb-4">
              <div className="form-section-title">Deposit Details</div>
              {selectedCounter ? (
                <div className="counter-chip mb-3">
                  <p className="eyebrow mb-1">Current Department</p>
                  <p className="fw-semibold mb-0">
                    {selectedCounter.name}
                    {selectedCounter.code ? ` (${selectedCounter.code})` : ''}
                  </p>
                </div>
              ) : null}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label" htmlFor="cash-deposit-account">To Bank *</label>
                  <select
                    id="cash-deposit-account"
                    className="form-select"
                    value={accountId}
                    onChange={(event) => {
                      setAccountId(event.target.value);
                      setValidationError('');
                    }}
                    disabled={isSubmitting || isAccountsLoading}
                    required
                  >
                    <option value="">{isAccountsLoading ? 'Loading accounts...' : 'Select Bank Account'}</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName} - {account.accountHolder}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="cash-deposit-amount">Amount *</label>
                  <input
                    id="cash-deposit-amount"
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
                  <label className="form-label" htmlFor="cash-deposit-remark">Remark</label>
                  <textarea
                    id="cash-deposit-remark"
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
                {isSubmitting ? 'Depositing...' : 'Deposit'}
              </button>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </div>
  );
}
