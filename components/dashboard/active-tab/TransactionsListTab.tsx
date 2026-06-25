'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaPrint, FaSearch } from 'react-icons/fa';
import { getTransactions, payTransaction } from '../../../lib/api/transactions';
import { createFallbackPagination } from '../../../lib/api/pagination';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../../lib/customer-balance-format';
import { mapTransactionsPageResponse } from '../../../lib/mappers/transaction-mapper';
import type { Transaction } from '../../../lib/store';
import { formatDate } from '../../../src/utils/dateFormatter';
import DataTable, { type DataTableColumn } from '../../tables/DataTable';
import PermissionState from '../../ui/state/PermissionState';
import type { DashboardTabContext } from './types';
import { usePersistentPageSize } from '../../../lib/hooks/usePersistentPageSize';

interface TransactionsListTabProps {
  ctx: DashboardTabContext;
}

const formatCurrency = (value: number | undefined) => `₹${(value ?? 0).toLocaleString('en-IN')}`;
const getTodayDate = () => new Date().toLocaleDateString('en-CA');
const readTransactionBalance = (transaction: Transaction) => Number(transaction.currentBalance ?? transaction.dueAmount ?? 0);
const readTransactionTotalAmount = (transaction: Transaction) => transaction.totalAmount ?? transaction.total_amount ?? 0;
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
  onlineAmount: '',
  cashAmount: '',
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
    getRoleLabel,
    handlePrintReceipt,
    renderSummaryCards,
    reloadAccounts,
    reloadCustomerBalance,
    reloadDepartments,
    reloadTransactions,
    selectedCounter,
    showNotification,
    transactionSummary,
  } = ctx;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const {
    pageSize,
    setPageSize,
    isPageSizeReady,
  } = usePersistentPageSize('transactions_page_size');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listPagination, setListPagination] = useState(() => createFallbackPagination(0, 1, pageSize));
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [dateFrom, setDateFrom] = useState(getTodayDate);
  const [dateTo, setDateTo] = useState(getTodayDate);
  const requestSequence = useRef(0);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});
  const [settledTransactionIds, setSettledTransactionIds] = useState<string[]>([]);
  const isShortSearch = debouncedSearch.length > 0 && debouncedSearch.length < 3;
  const displayedTransactions = transactions.filter((transaction) => (
    !settledTransactionIds.includes(transaction.id)
  ));

  useEffect(() => {
    const trimmedSearch = searchQuery.trim();

    if (trimmedSearch !== debouncedSearch) {
      requestSequence.current += 1;
      setTransactions([]);
      setListError('');
    }

    if (trimmedSearch.length > 0 && trimmedSearch.length < 3) {
      setListPagination(createFallbackPagination(0, 1, pageSize));
      setIsListLoading(false);
    }

    const timer = window.setTimeout(() => {
      setDebouncedSearch(trimmedSearch);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [debouncedSearch, searchQuery]);

  useEffect(() => {
    if (isShortSearch || !isPageSizeReady) {
      requestSequence.current += 1;
      setTransactions([]);
      setListPagination(createFallbackPagination(0, 1, pageSize));
      setIsListLoading(false);
      setListError('');
      return;
    }

    const controller = new AbortController();
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;

    setTransactions([]);
    setListError('');
    setIsListLoading(true);

    const loadTransactions = async () => {
      try {
        const payload = await getTransactions({
          pageNo: currentPage,
          limit: pageSize,
          status: 1,
          search: debouncedSearch || undefined,
          counterId: selectedCounter?.id,
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        }, {
          signal: controller.signal,
        });
        const page = mapTransactionsPageResponse(payload, currentPage, pageSize);

        if (requestSequence.current !== sequence) {
          return;
        }

        setTransactions(page.transactions);
        setListPagination(page.pagination);
      } catch (error) {
        if (controller.signal.aborted || requestSequence.current !== sequence) {
          return;
        }

        setTransactions([]);
        setListPagination(createFallbackPagination(0, currentPage, pageSize));
        setListError(error instanceof Error ? error.message : 'Unable to load transactions.');
      } finally {
        if (!controller.signal.aborted && requestSequence.current === sequence) {
          setIsListLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      controller.abort();
    };
  }, [currentPage, dateFrom, dateTo, debouncedSearch, isPageSizeReady, isShortSearch, pageSize, selectedCounter?.id]);
  const getPaymentDraft = (transactionId: string) => paymentDrafts[transactionId] || createPaymentDraft();
  const getPaymentError = (draft: PaymentDraft) => {
    const onlineAmount = toPaymentAmount(draft.onlineAmount);
    const cashAmount = toPaymentAmount(draft.cashAmount);

    if (onlineAmount < 0 || cashAmount < 0) return 'Amount cannot be negative.';
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

    showNotification('success', 'Transaction moved to Customers Outstanding.');
    setSettledTransactionIds((current) => (
      current.includes(transaction.id) ? current : [...current, transaction.id]
    ));
    setPaymentDrafts((current) => {
      const next = { ...current };
      delete next[transaction.id];
      return next;
    });
    reloadTransactions();
    reloadCustomerBalance();
    reloadAccounts();
    reloadDepartments();
  };

  const columns: Array<DataTableColumn<Transaction>> = [
    {
      key: 'date',
      header: 'Transaction Date',
      render: (transaction) => formatDate(transaction.date),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (transaction) => (
        <div className="transaction-list-customer">
          <span className="transaction-list-customer__name">{getCustomerName(transaction)}</span>
          <span className="transaction-list-customer__code">{formatCustomerId(transaction)}</span>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      render: (transaction) => (
        <div className="transaction-list-amount">
          <span className="transaction-list-amount__value">
            {formatCurrency(readTransactionTotalAmount(transaction))}
          </span>
          <span className="transaction-list-amount__charges">
            A: {formatCurrency(transaction.amount)}
            <span aria-hidden="true"> | </span>
            S: {formatCurrency(transaction.serviceCharge)}
            <span aria-hidden="true"> | </span>
            B: {formatCurrency(transaction.bankCharge)}
            <span aria-hidden="true"> | </span>
            O: {formatCurrency(transaction.otherCharge)}
          </span>
        </div>
      ),
    },
    {
      key: 'currentBalance',
      header: 'Current Balance',
      render: (transaction) => {
        const balance = readTransactionBalance(transaction);

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
              style={{ minHeight: '2rem' }}
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
        <DataTable
          rows={displayedTransactions}
          getRowKey={(transaction) => transaction.id}
          className="transaction-list-table"
          eyebrow="Transactions"
          title="Transactions List"
          copy="Saved customer transactions with department, balance, and operator details."
          emptyLabel={
            isShortSearch
              ? 'Enter at least 3 characters to search'
              : debouncedSearch
                ? 'No matching records found'
                : 'No transactions found'
          }
          isLoading={isListLoading}
          error={listError}
          pagination={{
            currentPage: listPagination.currentPage,
            totalPages: listPagination.totalPages,
            totalRecords: listPagination.totalRecords,
            limit: listPagination.limit,
            isLoading: isListLoading,
            onPageChange: setCurrentPage,
            showDateFilter: true,
            dateFrom,
            dateTo,
            onDateFromChange: (value) => {
              setDateFrom(value);
              setCurrentPage(1);
            },
            onDateToChange: (value) => {
              setDateTo(value);
              setCurrentPage(1);
            },
            onLimitChange: (limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            },
          }}

          // not needed this part in table 
          
          // headerAction={(
          //   <div className="table-filter-trigger transaction-list-search">
          //     <FaSearch />
          //     <input
          //       className="form-control"
          //       placeholder="Search by customer, code, mobile, or invoice"
          //       value={searchQuery}
          //       autoComplete="off"
          //       spellCheck={false}
          //       onChange={(event) => {
          //         setSearchQuery(event.target.value);
          //         setCurrentPage(1);
          //       }}
          //     />
          //   </div>
          // )}
          columns={columns}
          renderActions={(transaction) => (
            <div className="table-actions">
              <button
                type="button"
                className="btn-icon-sm btn-icon-sm--primary"
                onClick={() => router.push(`/transactions/add?transaction_id=${encodeURIComponent(transaction.id)}&mode=edit`)}
                aria-label="View transaction"
                title="Open transaction"
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

      {renderSummaryCards(transactionSummary)}
    </div>
  );
}
