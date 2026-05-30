'use client';

import { useMemo, useState } from 'react';
import { FaEye, FaPrint, FaSearch } from 'react-icons/fa';
import { payTransaction } from '../../../lib/api/transactions';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../../lib/customer-balance-format';
import type { Transaction } from '../../../lib/store';
import DataTable, { type DataTableColumn } from '../../tables/DataTable';
import PermissionState from '../../ui/state/PermissionState';
import type { DashboardTabContext } from './types';

interface TransactionsListTabProps {
  ctx: DashboardTabContext;
}

const pageSize = 10;

const formatCurrency = (value: number | undefined) => `Rs. ${(value ?? 0).toLocaleString('en-IN')}`;
const formatCustomerId = (transaction: Transaction) => {
  if (transaction.customerCode) return transaction.customerCode;

  const numericId = Number(transaction.customerId);
  if (Number.isFinite(numericId) && numericId > 0) {
    return `CUS-${String(numericId).padStart(4, '0')}`;
  }

  return transaction.customerId ? String(transaction.customerId) : '-';
};
const getCustomerName = (transaction: Transaction) => transaction.customerName || '-';
interface PaymentDraft {
  onlineAmount: string;
  cashAmount: string;
  accountId: string;
  error: string;
  touched: boolean;
  isSubmitting: boolean;
}

const createPaymentDraft = (): PaymentDraft => ({
  onlineAmount: '0',
  cashAmount: '0',
  accountId: '',
  error: '',
  touched: false,
  isSubmitting: false,
});

const toPaymentAmount = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : -1;
};

export default function TransactionsListTab({ ctx }: TransactionsListTabProps) {
  const {
    accounts,
    canManageModule,
    currentRole,
    filteredTransactionRecords,
    getRoleLabel,
    handlePrintReceipt,
    handleViewTransaction,
    isTransactionsLoading,
    reloadAccounts,
    reloadCustomerBalance,
    reloadDepartments,
    reloadTransactions,
    selectedCounter,
    showNotification,
  } = ctx;
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchedTransactions = useMemo(() => (
    normalizedSearch
      ? filteredTransactionRecords.filter((transaction) => [
          transaction.customerName,
          transaction.customerCode,
          transaction.customerId,
          transaction.invoiceId,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedSearch)))
      : filteredTransactionRecords
  ), [filteredTransactionRecords, normalizedSearch]);
  const totalPages = Math.max(1, Math.ceil(searchedTransactions.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = searchedTransactions.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );
  const getPaymentDraft = (transactionId: string) => paymentDrafts[transactionId] || createPaymentDraft();
  const getPaymentError = (draft: PaymentDraft) => {
    const onlineAmount = toPaymentAmount(draft.onlineAmount);
    const cashAmount = toPaymentAmount(draft.cashAmount);

    if (onlineAmount < 0 || cashAmount < 0) return 'Amount cannot be negative.';
    if (onlineAmount + cashAmount <= 0) return 'Enter payment amount.';
    if (onlineAmount > 0 && !draft.accountId) return 'Select bank account for online payment.';

    return '';
  };
  const updatePaymentDraft = (transactionId: string, values: Partial<PaymentDraft>) => {
    setPaymentDrafts((current) => {
      const nextDraft = {
        ...createPaymentDraft(),
        ...current[transactionId],
        ...values,
        touched: true,
      };

      const explicitError = typeof values.error === 'string' && values.error ? values.error : '';

      return {
        ...current,
        [transactionId]: {
          ...nextDraft,
          error: explicitError || getPaymentError(nextDraft),
        },
      };
    });
  };
  const submitPayment = async (transaction: Transaction) => {
    const draft = getPaymentDraft(transaction.id);
    const error = getPaymentError({ ...draft, touched: true });
    if (error) {
      updatePaymentDraft(transaction.id, { error });
      return;
    }

    const onlineAmount = toPaymentAmount(draft.onlineAmount);
    const cashAmount = toPaymentAmount(draft.cashAmount);
    updatePaymentDraft(transaction.id, { isSubmitting: true, error: '' });
    const result = await payTransaction({
      transactionId: transaction.id,
      customerId: transaction.customerId,
      counterId: transaction.departmentId || selectedCounter?.id || null,
      onlineAmount,
      cashAmount,
      accountId: onlineAmount > 0 ? draft.accountId : null,
    });

    if (!result.success) {
      updatePaymentDraft(transaction.id, { isSubmitting: false, error: result.message || 'Unable to pay transaction.' });
      showNotification('error', result.message || 'Unable to pay transaction.');
      return;
    }

    showNotification('success', result.message || 'Transaction payment saved successfully.');
    setPaymentDrafts((current) => {
      const next = { ...current };
      delete next[transaction.id];
      return next;
    });
    reloadTransactions();
    reloadCustomerBalance();
    reloadDepartments();
    if (onlineAmount > 0) reloadAccounts();
  };

  const columns: Array<DataTableColumn<Transaction>> = [
    {
      key: 'date',
      header: 'Transaction Date',
      render: (transaction) => transaction.date,
    },
    {
      key: 'customer',
      header: 'Customer ID/Name',
      render: (transaction) => (
        <span className="transaction-list-customer">
          <span className="data-table__primary">{formatCustomerId(transaction)}</span>
          <span>{getCustomerName(transaction)}</span>
        </span>
      ),
    },
    {
      key: 'transactionAmount',
      header: 'Transaction Amount',
      render: (transaction) => formatCurrency(transaction.transactionAmount ?? transaction.amount),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      render: (transaction) => <span className="data-table__primary">{formatCurrency(transaction.totalAmount)}</span>,
    },
    {
      key: 'currentBalance',
      header: 'Current Balance',
      render: (transaction) => {
        const balance = transaction.currentBalance ?? transaction.dueAmount;

        return (
          <span className={getCustomerBalanceClassName(balance)}>
            {formatCustomerBalance(balance)}
          </span>
        );
      },
    },
    {
      key: 'addedBy',
      header: 'Added By',
      render: (transaction) => transaction.addedByName || '-',
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (transaction) => {
        const draft = getPaymentDraft(transaction.id);
        const onlineAmount = toPaymentAmount(draft.onlineAmount);
        const validationError = getPaymentError(draft);
        const shouldShowError = Boolean(draft.error || (draft.touched && validationError));
        const isPayDisabled = Boolean(validationError) || draft.isSubmitting;

        return (
          <div className="transaction-payment-cell">
            <input
              aria-label="Online amount"
              className="form-control transaction-payment-cell__input"
              min="0"
              placeholder="Online"
              title="Online payment"
              type="number"
              value={draft.onlineAmount}
              onChange={(event) => updatePaymentDraft(transaction.id, { onlineAmount: event.target.value })}
            />
            <select
              aria-label="Bank Account"
              className="form-select transaction-payment-cell__select"
              value={draft.accountId}
              onChange={(event) => updatePaymentDraft(transaction.id, { accountId: event.target.value })}
              disabled={onlineAmount <= 0}
            >
              <option value="">{onlineAmount > 0 ? 'Account' : 'No account'}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountHolder} | {account.bankName}
                </option>
              ))}
            </select>
            <input
              aria-label="Cash amount"
              className="form-control transaction-payment-cell__input"
              min="0"
              placeholder="Cash"
              title="Cash payment"
              type="number"
              value={draft.cashAmount}
              onChange={(event) => updatePaymentDraft(transaction.id, { cashAmount: event.target.value })}
            />
            <button
              type="button"
              className="btn-app btn-app-primary transaction-payment-cell__button"
              disabled={isPayDisabled}
              onClick={() => submitPayment(transaction)}
            >
              {draft.isSubmitting ? 'Paying...' : 'Pay'}
            </button>
            {shouldShowError ? (
              <span className="transaction-payment-cell__error">{draft.error || validationError}</span>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (!canManageModule('transactions')) {
    return (
      <PermissionState
        eyebrow="Transactions List"
        title="Transaction records are restricted"
        description={`${getRoleLabel(currentRole)} cannot review transaction records.`}
      />
    );
  }

  return (
    <div className="row g-4">
      <div className="col-12">
        <section className="panel p-4">
          <div className="form-section-title mb-1">Transactions List</div>
          <p className="page-muted mb-0">Search, review, print, and collect payments for saved transactions.</p>
        </section>
      </div>

      <div className="col-12">
        <DataTable
          rows={paginatedTransactions}
          getRowKey={(transaction) => transaction.id}
          eyebrow="Transactions"
          title="Transactions List"
          copy="Saved customer transactions with department, balance, and operator details."
          emptyLabel="No transactions found."
          isLoading={isTransactionsLoading}
          pagination={{
            currentPage: safeCurrentPage,
            totalPages,
            totalRecords: searchedTransactions.length,
            limit: pageSize,
            isLoading: isTransactionsLoading,
            onPageChange: setCurrentPage,
          }}
          headerAction={(
            <div className="table-filter-trigger transaction-list-search">
              <FaSearch />
              <input
                className="form-control"
                placeholder="Search by customer, code, or invoice"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
          columns={columns}
          renderActions={(transaction) => (
            <div className="table-actions">
              <button
                type="button"
                className="btn-icon-sm btn-icon-sm--primary"
                onClick={() => handleViewTransaction(transaction)}
                aria-label="View transaction"
                title="View transaction"
              >
                <FaEye size={12} />
              </button>
              <button
                type="button"
                className="btn-icon-sm btn-icon-sm--primary"
                onClick={() => handlePrintReceipt(transaction)}
                aria-label="Print transaction"
                title="Print transaction"
              >
                <FaPrint size={12} />
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
