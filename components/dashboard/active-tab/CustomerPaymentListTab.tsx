'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaSearch } from 'react-icons/fa';
import { getCustomerBalance } from '../../../lib/api/customerBalance';
import {
  getCustomerPaymentPage,
  searchCustomers,
  type Customer,
  type CustomerPaymentPage,
} from '../../../lib/api/customerPaymentList';
import { mapCustomerBalanceResponse } from '../../../lib/mappers/customer-balance-mapper';
import { getCustomerWorkspacePath } from '../../../lib/workspace-routes';
import { formatDateTime } from '../../../src/utils/dateFormatter';
import RemarkCell from '../../common/RemarkCell';
import CustomerPaymentModal from '../CustomerPaymentModal';
import DataTable from '../../tables/DataTable';
import EmptyState from '../../ui/state/EmptyState';
import type { DashboardTabContext } from './types';

interface CustomerPaymentListTabProps {
  ctx: DashboardTabContext;
}

const EMPTY_PAGE: CustomerPaymentPage = {
  transactions: [],
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  limit: 10,
};

const getTodayDate = () => new Date().toLocaleDateString('en-CA');
const PAYMENT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500] as const;
const PAYMENT_PAGE_SIZE_STORAGE_KEY = 'customer_payments_page_size';
const formatCustomerSearchLabel = (customer: Customer) => [
  customer.name,
  customer.code,
  customer.phone,
].filter(Boolean).join(' / ');
const formatSelectedCustomerLabel = (customer: Customer) => (
  customer.code ? `${customer.name} (${customer.code})` : customer.name
);
const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const formatPaymentRemark = (remark: string, customerName: string) => {
  const base = `CustomerPaymentToBank/${customerName}`.replace(/\/+$/, '');
  const trimmedRemark = (remark || '').trim().replace(/\/+$/, '');

  if (!trimmedRemark || trimmedRemark === '-') return base;
  if (trimmedRemark.startsWith(base)) return trimmedRemark.replace(/\/+$/, '');
  if (trimmedRemark.startsWith('CustomerPaymentToBank/')) return trimmedRemark.replace(/\/+$/, '');

  return `${base}/${trimmedRemark}`;
};

export default function CustomerPaymentListTab({ ctx }: CustomerPaymentListTabProps) {
  const {
    currentRole,
    customerPageOptions,
    hasRequestedCustomerPageAccess,
    canViewCustomerRecords,
    renderCustomerRoutePermissionState,
    selectedCounter,
    accounts,
    handleCustomerBalancePayment,
    reloadCustomerBalance,
  } = ctx;
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState<(typeof PAYMENT_PAGE_SIZE_OPTIONS)[number]>(10);
  const [isPageSizeReady, setIsPageSizeReady] = useState(false);
  const [paymentPage, setPaymentPage] = useState<CustomerPaymentPage>(EMPTY_PAGE);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [dateFrom, setDateFrom] = useState(getTodayDate);
  const [dateTo, setDateTo] = useState(getTodayDate);
  const [reloadToken, setReloadToken] = useState(0);
  const [balanceDetails, setBalanceDetails] = useState<{ currentBalance: number; todayBalance: number } | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const storedLimit = Number(window.localStorage.getItem(PAYMENT_PAGE_SIZE_STORAGE_KEY));
    if (PAYMENT_PAGE_SIZE_OPTIONS.includes(storedLimit as (typeof PAYMENT_PAGE_SIZE_OPTIONS)[number])) {
      setLimitState(storedLimit as (typeof PAYMENT_PAGE_SIZE_OPTIONS)[number]);
    }
    setIsPageSizeReady(true);
  }, []);

  useEffect(() => {
    const searchTerm = query.trim();
    if (selectedCustomer || searchTerm.length < 3) {
      setCustomers([]);
      setIsSearchLoading(false);
      setHasSearched(false);
      setSearchError('');
      setIsDropdownOpen(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchLoading(true);
    setHasSearched(false);
    setSearchError('');

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchCustomers(searchTerm, controller.signal);
        setCustomers(results);
        setHasSearched(true);
        setIsDropdownOpen(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCustomers([]);
        setHasSearched(true);
        setSearchError(error instanceof Error ? error.message : 'Unable to search customers.');
        setIsDropdownOpen(true);
      } finally {
        if (!controller.signal.aborted) setIsSearchLoading(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer || !isPageSizeReady) {
      setPaymentPage(EMPTY_PAGE);
      setLedgerError('');
      return;
    }

    const controller = new AbortController();
    setIsLedgerLoading(true);
    setLedgerError('');

    void getCustomerPaymentPage(selectedCustomer.id, page, limit, dateFrom, dateTo, controller.signal)
      .then(setPaymentPage)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setPaymentPage((current) => ({ ...current, transactions: [] }));
        setLedgerError(error instanceof Error ? error.message : 'Unable to load customer payments.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLedgerLoading(false);
      });

    return () => controller.abort();
  }, [dateFrom, dateTo, isPageSizeReady, limit, page, reloadToken, selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer) {
      setBalanceDetails(null);
      setIsBalanceLoading(false);
      return;
    }

    let isCancelled = false;
    setIsBalanceLoading(true);

    void getCustomerBalance({ customerId: selectedCustomer.id, pageNo: 1, limit: 1, status: 1 })
      .then((response) => {
        if (isCancelled) return;
        const [balanceRow] = mapCustomerBalanceResponse(response);
        setBalanceDetails(balanceRow ? {
          currentBalance: Number(balanceRow.balance ?? balanceRow.currentBalanceStatus ?? 0),
          todayBalance: Number(balanceRow.todayBalance ?? 0),
        } : null);
      })
      .catch(() => {
        if (!isCancelled) setBalanceDetails(null);
      })
      .finally(() => {
        if (!isCancelled) setIsBalanceLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [reloadToken, selectedCustomer]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setQuery(formatSelectedCustomerLabel(customer));
    setCustomers([]);
    setIsDropdownOpen(false);
    setPage(1);
    setPaymentPage(EMPTY_PAGE);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setQuery('');
    setPage(1);
    setPaymentPage(EMPTY_PAGE);
    setLedgerError('');
    setBalanceDetails(null);
    setPayCustomer(null);
  };
  const updateLimit = (nextLimit: number) => {
    const normalizedLimit = PAYMENT_PAGE_SIZE_OPTIONS.includes(nextLimit as (typeof PAYMENT_PAGE_SIZE_OPTIONS)[number])
      ? nextLimit as (typeof PAYMENT_PAGE_SIZE_OPTIONS)[number]
      : 10;
    setLimitState(normalizedLimit);
    window.localStorage.setItem(PAYMENT_PAGE_SIZE_STORAGE_KEY, String(normalizedLimit));
    setPage(1);
  };
  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };
  const fallbackCurrentBalance = useMemo(() => (
    paymentPage.transactions.length > 0
      ? paymentPage.transactions[paymentPage.transactions.length - 1]?.balance ?? 0
      : 0
  ), [paymentPage.transactions]);
  const currentBalance = balanceDetails?.currentBalance ?? fallbackCurrentBalance;
  const todayBalance = balanceDetails?.todayBalance ?? 0;
  const openPayModal = () => {
    if (!selectedCustomer) return;
    setPayCustomer(selectedCustomer);
  };
  const refreshPaymentData = () => {
    setPage(1);
    setReloadToken((current) => current + 1);
    reloadCustomerBalance();
  };

  return (
    <div className="row g-4">
      {currentRole !== 'Admin' && customerPageOptions.length > 0 ? (
        <div className="col-12">
          <section className="panel p-4 customer-options-panel">
            <div className="panel-header customer-options-panel__header">
              <div>
                <p className="eyebrow">Customer Options</p>
                <h2 className="panel-title">Choose what you want to review</h2>
                <p className="panel-copy">Switch between the customer directory, payment list, and outstanding.</p>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {customerPageOptions.map((option) => (
                <Link
                  key={option.id}
                  href={getCustomerWorkspacePath(option.id)}
                  className={option.id === 'payments' ? 'btn-app btn-app-primary' : 'btn-app btn-app-secondary'}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <div className="col-12">
        {payCustomer ? (
          <CustomerPaymentModal
            target={{
              customerId: payCustomer.id,
              customerName: payCustomer.name,
              customerCode: payCustomer.code,
              currentBalance,
              todayBalance,
            }}
            accounts={accounts}
            counterId={selectedCounter?.id || null}
            onClose={() => setPayCustomer(null)}
            onPayment={handleCustomerBalancePayment}
            onSuccess={refreshPaymentData}
          />
        ) : null}

        {!hasRequestedCustomerPageAccess || !canViewCustomerRecords ? (
          renderCustomerRoutePermissionState()
        ) : (
          <>
            <section className="panel p-4 customer-payment-list-search mb-4">
              <div className="customer-outstanding-search-panel__header">
                <div>
                  <p className="eyebrow">Customer Search</p>
                  <h2 className="panel-title">Customer Payment List</h2>
                  <p className="panel-copy">Search by customer name or phone number.</p>
                </div>
                {selectedCustomer ? (
                  <button type="button" className="btn-app btn-app-secondary" onClick={clearCustomer}>
                    Clear Customer
                  </button>
                ) : null}
              </div>

              <div className="customer-payment-list-search__controls">
                <div className="customer-outstanding-search customer-payment-list-search__search-field">
                  <FaSearch className="customer-payment-list-search__search-icon" aria-hidden="true" />
                  <input
                    className="form-control customer-outstanding-search__input customer-payment-list-search__input"
                    type="search"
                    autoComplete="off"
                    placeholder="Type at least 3 characters"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedCustomer(null);
                    }}
                    onFocus={() => {
                      if (customers.length > 0 || hasSearched) setIsDropdownOpen(true);
                    }}
                  />

                  {isDropdownOpen && query.trim().length >= 3 && !selectedCustomer ? (
                    <div className="customer-outstanding-search__dropdown" role="listbox">
                      {isSearchLoading ? (
                        <div className="customer-outstanding-search__empty customer-payment-list-search__loading">
                          <span className="loading-spinner" aria-hidden="true" />
                          Searching customers...
                        </div>
                      ) : searchError ? (
                        <div className="customer-outstanding-search__empty text-danger" role="alert">{searchError}</div>
                      ) : customers.length > 0 ? (
                        customers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="customer-outstanding-search__option"
                            onClick={() => selectCustomer(customer)}
                            role="option"
                          >
                            <span className="data-table__primary">{formatCustomerSearchLabel(customer)}</span>
                          </button>
                        ))
                      ) : hasSearched ? (
                        <div className="customer-outstanding-search__empty">No customers found</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="customer-payment-list-search__filter-row">
                  <label className="customer-payment-list-search__field">
                    <span>From</span>
                    <input
                      className="form-control"
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(event) => {
                        setDateFrom(event.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <label className="customer-payment-list-search__field">
                    <span>To</span>
                    <input
                      className="form-control"
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(event) => {
                        setDateTo(event.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  {dateFrom || dateTo ? (
                    <button type="button" className="customer-payment-list-search__clear-date" onClick={clearDateRange}>
                      <span aria-hidden="true">×</span>
                      Clear
                    </button>
                  ) : null}
                  <label className="customer-payment-list-search__field customer-payment-list-search__field--rows">
                    <span>Rows</span>
                    <select
                      className="form-select"
                      value={limit}
                      onChange={(event) => updateLimit(Number(event.target.value))}
                    >
                      {PAYMENT_PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <p className="form-hint customer-payment-list-search__hint">
                {selectedCustomer
                  ? selectedCustomer.phone || 'No phone available'
                  : 'Select a customer to load their payment transactions.'}
              </p>
            </section>

            {!selectedCustomer ? (
              <EmptyState
                eyebrow="Customer Payments"
                title="Select a customer"
                description="Payment transactions are shown after you select a customer from search."
              />
            ) : (
              <DataTable
                rows={paymentPage.transactions}
                getRowKey={(transaction) => transaction.id}
                className="customer-payment-list-table"
                eyebrow="Customer Payments"
                emptyLabel="No transactions found"
                isLoading={isLedgerLoading}
                error={ledgerError}
                headerAction={(
                  <button
                    type="button"
                    className="btn-app btn-app-primary"
                    onClick={openPayModal}
                    disabled={isBalanceLoading}
                  >
                    Pay
                  </button>
                )}
                columns={[
                  {
                    key: 'serial',
                    header: 'S.No',
                    render: (_t, index) => ((paymentPage.currentPage - 1) * paymentPage.limit) + index + 1,
                  },
                  { key: 'date', header: 'Date', render: (t) => formatDateTime(t.date) },
                  { key: 'counterBank', header: 'Counter / Bank', render: (t) => t.counterBank },
                  { key: 'debit', header: 'Debit', render: (t) => t.debit > 0 ? formatCurrency(t.debit) : '₹0.00' },
                  { key: 'credit', header: 'Credit', render: (t) => t.credit > 0 ? formatCurrency(t.credit) : '₹0.00' },
                  {
                    key: 'balance',
                    header: 'Balance',
                    render: (t) => (
                      <span style={{ color: t.balance < 0 ? '#e53e3e' : 'inherit' }}>
                        {formatCurrency(t.balance)}
                      </span>
                    ),
                  },
                  { key: 'remark', header: 'Remark', render: (t) => <RemarkCell value={formatPaymentRemark(t.remark, selectedCustomer.name)} /> },
                  { key: 'addedBy', header: 'Added By', render: (t) => t.addedBy },
                ]}
                pagination={{
                  currentPage: paymentPage.currentPage,
                  totalPages: paymentPage.totalPages,
                  totalRecords: paymentPage.totalRecords,
                  limit: paymentPage.limit,
                  isLoading: isLedgerLoading,
                  onPageChange: setPage,
                  showPageSize: false,
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
