'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaFilter, FaPlusCircle } from 'react-icons/fa';
import { getCustomers } from '../../../lib/api/customers';
import { getCustomerWorkspaceViewUi, getModuleUi } from '../../../lib/module-ui';
import { customerPermissionOptions } from '../../../lib/platform-structure';
import { getCustomerWorkspacePath } from '../../../lib/workspace-routes';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../../lib/customer-balance-format';
import { mapCustomersResponse } from '../../../lib/mappers/customer-mapper';
import type { BusinessCustomer } from '../../../lib/store';
import { useCustomerOutstanding } from '../../../lib/hooks/useCustomerOutstanding';
import ActionModal from '../../ui/ActionModal';
import EmptyState from '../../ui/state/EmptyState';
import ErrorState from '../../ui/state/ErrorState';
import PermissionState from '../../ui/state/PermissionState';
import SectionHero from '../SectionHero';
import CustomersTable from '../../tables/CustomersTable';
import CustomerPaymentsTable from '../../tables/CustomerPaymentsTable';
import CustomerOutstandingTable from '../../tables/CustomerOutstandingTable';
import DataTableFilters, { type DataTableFiltersConfig } from '../../common/DataTableFilters';
import CustomerPaymentModal from '../CustomerPaymentModal';
import type { DashboardTabContext } from './types';
import type { CustomerBalance } from '../../../lib/api/customerBalance';

interface CustomersTabProps {
  ctx: DashboardTabContext;
}

export default function CustomersTab({ ctx }: CustomersTabProps) {
  const {
    currentRole,
    customerSectionTitle,
    customerSectionDescription,
    canAddCustomerRecords,
    customerEntityLabel,
    customerEntityPlural,
    renderSummaryCards,
    customerSummary,
    customerPageOptions,
    customerPageView,
    hasRequestedCustomerPageAccess,
    canViewCustomerRecords,
    customerDirectoryRecords,
    customerOutstandingRows,
    isCustomersLoading,
    isCustomerBalanceLoading,
    customerBalanceError,
    handleEditCustomer,
    handleCustomerBalancePayment,
    selectedCounter,
    accounts,
    canEditCustomerRecords,
    renderCustomerRoutePermissionState,
    handleQuickAction,
    businessDirectoryFilters,
    setBusinessDirectoryFilters,
    businessPermissionFilterLabel,
    hasActiveBusinessDirectoryFilters,
    isBusinessDirectoryLoading,
    businessDirectoryError,
    customerDirectoryPagination,
    customerOutstandingPagination,
    roleTemplates,
  } = ctx;
  const [isBusinessFilterOpen, setIsBusinessFilterOpen] = useState(false);
  const [draftBusinessFilters, setDraftBusinessFilters] = useState(businessDirectoryFilters);
  const [payingBalance, setPayingBalance] = useState<CustomerBalance | null>(null);
  const [outstandingCustomerSearch, setOutstandingCustomerSearch] = useState('');
  const [outstandingCustomerOptions, setOutstandingCustomerOptions] = useState<BusinessCustomer[]>([]);
  const [selectedOutstandingCustomer, setSelectedOutstandingCustomer] = useState<BusinessCustomer | null>(null);
  const [isOutstandingCustomerSearchLoading, setIsOutstandingCustomerSearchLoading] = useState(false);
  const [hasOutstandingCustomerSearchCompleted, setHasOutstandingCustomerSearchCompleted] = useState(false);
  const [isOutstandingCustomerDropdownOpen, setIsOutstandingCustomerDropdownOpen] = useState(false);
  const {
    rows: selectedCustomerOutstandingRows,
    isLoading: isSelectedCustomerOutstandingLoading,
    error: selectedCustomerOutstandingError,
    reload: reloadSelectedCustomerOutstanding,
  } = useCustomerOutstanding(
    currentRole !== 'Admin' && customerPageView === 'payments' && Boolean(selectedOutstandingCustomer?.id),
    selectedOutstandingCustomer?.id,
  );
  const getCustomerName = (customer: BusinessCustomer) => customer.customerName || customer.name;
  const getCustomerPhone = (customer: BusinessCustomer) => customer.mobileNo || customer.phone;
  const getCustomerCode = (customer: BusinessCustomer) => customer.customerCode || '';
  const getCustomerSearchLabel = (customer: BusinessCustomer) => [
    getCustomerName(customer),
    getCustomerCode(customer),
    getCustomerPhone(customer),
  ].filter(Boolean).join(' / ');
  const normalizedOutstandingCustomerSearch = outstandingCustomerSearch.trim().toLowerCase();
  const filteredOutstandingCustomerOptions = normalizedOutstandingCustomerSearch.length >= 3
    ? outstandingCustomerOptions.filter((customer) => getCustomerSearchLabel(customer).toLowerCase().includes(normalizedOutstandingCustomerSearch))
    : [];
  const selectedOutstandingCustomerBalance = useMemo(() => {
    if (selectedCustomerOutstandingRows.length === 0) return '-';

    const lastRow = selectedCustomerOutstandingRows[selectedCustomerOutstandingRows.length - 1];
    return lastRow.balance ?? lastRow.currentBalanceStatus;
  }, [selectedCustomerOutstandingRows]);
  const businessDirectoryFiltersConfig: DataTableFiltersConfig = {
    search: {
      enabled: true,
      fields: ['name', 'phone', 'email'],
      label: 'Search',
    },
    fields: [
      {
        field: 'permissions',
        label: 'Permissions',
        type: 'multi-select',
        options: customerPermissionOptions.map((option) => ({
          label: option.label,
          value: option.id,
        })),
      },
    ],
  };
  const customerModuleUi = getModuleUi('customers');
  const customerViewUi = getCustomerWorkspaceViewUi(customerPageView);
  const emptyAction = canAddCustomerRecords
    ? {
        label: `Add ${customerEntityLabel}`,
        onClick: () => handleQuickAction('add-customer'),
      }
    : undefined;
  const adminDirectoryEmptyTitle = !hasActiveBusinessDirectoryFilters
    ? 'No user records yet'
    : 'No users match these filters';
  const adminDirectoryEmptyDescription = !hasActiveBusinessDirectoryFilters
    ? 'Create a user workspace to start managing directory records from this screen.'
    : `Try different filters or clear ${businessPermissionFilterLabel}.`;
  const adminBusinessDirectoryError = currentRole === 'Admin' ? businessDirectoryError : '';
  const isCustomerDirectoryLoading = currentRole === 'Admin'
    ? isBusinessDirectoryLoading
    : isCustomersLoading;
  const isCustomerOutstandingLoading = currentRole !== 'Admin' && isCustomerBalanceLoading;
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && customerPageView === 'outstanding') {
      console.log('[Customers Outstanding][Page] Rows passed to table:', customerOutstandingRows);
    }
  }, [customerOutstandingRows, customerPageView]);
  const openBusinessFilter = () => {
    setDraftBusinessFilters(businessDirectoryFilters);
    setIsBusinessFilterOpen(true);
  };
  const applyBusinessFilter = () => {
    setBusinessDirectoryFilters(draftBusinessFilters);
    setIsBusinessFilterOpen(false);
  };
  const businessFilterAction = currentRole === 'Admin' ? (
    <div className="table-filter-trigger">
      <button type="button" className="btn-app btn-app-secondary" onClick={openBusinessFilter}>
        <FaFilter />
        Filter
      </button>
      {hasActiveBusinessDirectoryFilters ? (
        <span className="status-chip status-chip--info">{businessPermissionFilterLabel}</span>
      ) : null}
    </div>
  ) : undefined;
  useEffect(() => {
    if (customerPageView !== 'payments' || selectedOutstandingCustomer) {
      setIsOutstandingCustomerDropdownOpen(false);
      setIsOutstandingCustomerSearchLoading(false);
      setHasOutstandingCustomerSearchCompleted(false);
      return;
    }

    const searchTerm = outstandingCustomerSearch.trim();
    if (searchTerm.length < 3) {
      setOutstandingCustomerOptions([]);
      setIsOutstandingCustomerDropdownOpen(false);
      setIsOutstandingCustomerSearchLoading(false);
      setHasOutstandingCustomerSearchCompleted(false);
      return;
    }

    let isActive = true;
    setIsOutstandingCustomerSearchLoading(true);
    setHasOutstandingCustomerSearchCompleted(false);

    const searchTimer = window.setTimeout(async () => {
      try {
        const response = await getCustomers({ search: searchTerm, status: 1 });
        if (!isActive) return;

        setOutstandingCustomerOptions(mapCustomersResponse(response));
        setHasOutstandingCustomerSearchCompleted(true);
        setIsOutstandingCustomerDropdownOpen(true);
      } catch {
        if (!isActive) return;

        setOutstandingCustomerOptions([]);
        setHasOutstandingCustomerSearchCompleted(true);
        setIsOutstandingCustomerDropdownOpen(true);
      } finally {
        if (isActive) setIsOutstandingCustomerSearchLoading(false);
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(searchTimer);
    };
  }, [customerPageView, outstandingCustomerSearch, selectedOutstandingCustomer]);

  const selectOutstandingCustomer = (customer: BusinessCustomer) => {
    setSelectedOutstandingCustomer(customer);
    setOutstandingCustomerSearch(getCustomerSearchLabel(customer));
    setOutstandingCustomerOptions([]);
    setIsOutstandingCustomerDropdownOpen(false);
    setHasOutstandingCustomerSearchCompleted(false);
  };
  const clearOutstandingCustomer = () => {
    setSelectedOutstandingCustomer(null);
    setOutstandingCustomerSearch('');
    setOutstandingCustomerOptions([]);
    setIsOutstandingCustomerDropdownOpen(false);
    setHasOutstandingCustomerSearchCompleted(false);
  };
  const openPayModal = (balance: CustomerBalance) => {
    setPayingBalance(balance);
  };
  const closePayModal = () => {
    setPayingBalance(null);
  };

  return (
    <div className="row g-4">
      {isBusinessFilterOpen ? (
        <ActionModal
          title="Filter Users"
          eyebrow="User Filters"
          description="Choose filters, then click Filter to update the user list."
          onClose={() => setIsBusinessFilterOpen(false)}
        >
          <DataTableFilters
            filters={businessDirectoryFiltersConfig}
            value={draftBusinessFilters}
            onChange={setDraftBusinessFilters}
            showHeader={false}
            showFooterHint={false}
            className="table-filter-panel--modal"
          />
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsBusinessFilterOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-app btn-app-primary" onClick={applyBusinessFilter}>
              Filter
            </button>
          </div>
        </ActionModal>
      ) : null}

      {payingBalance ? (
        <CustomerPaymentModal
          target={{
            customerId: payingBalance.customerId,
            customerName: payingBalance.customerName,
            customerCode: payingBalance.customerCode,
            currentBalance: payingBalance.currentBalanceStatus,
            todayBalance: payingBalance.todayBalance,
          }}
          accounts={accounts}
          counterId={selectedCounter?.id || null}
          onClose={closePayModal}
          onPayment={handleCustomerBalancePayment}
          onSuccess={reloadSelectedCustomerOutstanding}
        />
      ) : null}

      {currentRole === 'Admin' ? (
        <div className="col-12">
          <SectionHero
            eyebrow="User Hub"
            title={customerSectionTitle}
            description={customerSectionDescription}
            action={canAddCustomerRecords ? {
              label: `Add ${customerEntityLabel}`,
              icon: <FaPlusCircle />,
              onClick: () => handleQuickAction('add-customer'),
            } : undefined}
          />
        </div>
      ) : null}

      {currentRole !== 'Admin' && (customerPageOptions.length > 0 || canAddCustomerRecords) ? (
        <div className="col-12">
          <section className="panel p-4 customer-options-panel">
            <div className="panel-header customer-options-panel__header">
              <div>
                <p className="eyebrow">Customer Options</p>
                <h2 className="panel-title">Choose what you want to review</h2>
                <p className="panel-copy">Switch between the customer directory, payment list, and outstanding.</p>
              </div>
              {canAddCustomerRecords ? (
                <button
                  type="button"
                  className="btn-app btn-app-primary customer-options-panel__add"
                  onClick={() => handleQuickAction('add-customer')}
                >
                  <FaPlusCircle />
                  Add {customerEntityLabel}
                </button>
              ) : null}
            </div>
            {customerPageOptions.length > 0 ? (
              <div className="d-flex flex-wrap gap-2">
                {customerPageOptions.map((option) => (
                  <Link
                    key={option.id}
                    href={getCustomerWorkspacePath(option.id)}
                    className={customerPageView === option.id ? 'btn-app btn-app-primary' : 'btn-app btn-app-secondary'}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      <div className="col-12">
        {!hasRequestedCustomerPageAccess ? (
          renderCustomerRoutePermissionState()
        ) : canViewCustomerRecords ? (
          currentRole === 'Admin' || customerPageView === 'list' ? (
            adminBusinessDirectoryError && customerDirectoryRecords.length === 0 && !isCustomerDirectoryLoading ? (
              <ErrorState
                eyebrow="User Directory"
                title="Unable to load users"
                description={adminBusinessDirectoryError}
              />
            ) : customerDirectoryRecords.length === 0 && !isCustomerDirectoryLoading ? (
              <EmptyState
                eyebrow={currentRole === 'Admin' ? 'User Directory' : customerModuleUi?.label}
                title={currentRole === 'Admin' ? adminDirectoryEmptyTitle : customerViewUi.emptyTitle}
                description={currentRole === 'Admin' ? adminDirectoryEmptyDescription : customerViewUi.emptyDescription}
                action={emptyAction}
              />
            ) : (
              <CustomersTable
                customers={customerDirectoryRecords}
                eyebrow={customerEntityPlural}
                title={currentRole === 'Admin' ? 'User directory' : 'Customer directory'}
                copy={currentRole === 'Admin'
                  ? `User records, login status, and permission access. Current filter: ${businessPermissionFilterLabel}.`
                  : 'Contact details and profile status used across service workflows.'}
                entityLabel={customerEntityLabel}
                emptyLabel={currentRole === 'Admin' ? 'No users found' : 'No customers found'}
                isLoading={isCustomerDirectoryLoading}
                pagination={customerDirectoryPagination}
                headerAction={businessFilterAction}
                showRoleColumn={currentRole === 'Admin'}
                roleTemplates={roleTemplates}
                onEdit={canEditCustomerRecords ? handleEditCustomer : undefined}
              />
            )
          ) : customerPageView === 'payments' ? (
            <>
              <section className="panel p-4 customer-outstanding-search-panel mb-4">
                <div className="customer-outstanding-search-panel__header">
                  <div>
                    <p className="eyebrow">Customer Search</p>
                    <h2 className="panel-title">Search customer payment ledger</h2>
                    <p className="panel-copy">Search by customer name, phone number, or customer code.</p>
                  </div>
                  {selectedOutstandingCustomer ? (
                    <div className="customer-outstanding-search-panel__actions">
                      {selectedCustomerOutstandingRows.length > 0 ? (
                        <button
                          type="button"
                          className="btn-app btn-app-primary"
                          onClick={() => openPayModal(selectedCustomerOutstandingRows[selectedCustomerOutstandingRows.length - 1])}
                        >
                          Pay Customer
                        </button>
                      ) : null}
                      <button type="button" className="btn-app btn-app-secondary" onClick={clearOutstandingCustomer}>
                        Clear Customer
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="customer-outstanding-search">
                  <input
                    className="form-control customer-outstanding-search__input"
                    placeholder="Search customer by name, phone, or code"
                    value={outstandingCustomerSearch}
                    readOnly={Boolean(selectedOutstandingCustomer)}
                    onChange={(event) => {
                      setOutstandingCustomerSearch(event.target.value);
                      setSelectedOutstandingCustomer(null);
                    }}
                    onFocus={() => {
                      if (filteredOutstandingCustomerOptions.length > 0) {
                        setIsOutstandingCustomerDropdownOpen(true);
                      }
                    }}
                  />
                  {isOutstandingCustomerDropdownOpen && normalizedOutstandingCustomerSearch.length >= 3 ? (
                    <div className="customer-outstanding-search__dropdown">
                      {isOutstandingCustomerSearchLoading ? (
                        <div className="customer-outstanding-search__empty">Searching customers...</div>
                      ) : filteredOutstandingCustomerOptions.length > 0 ? (
                        filteredOutstandingCustomerOptions.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="customer-outstanding-search__option"
                            onClick={() => selectOutstandingCustomer(customer)}
                          >
                            {getCustomerSearchLabel(customer)}
                          </button>
                        ))
                      ) : hasOutstandingCustomerSearchCompleted ? (
                        <div className="customer-outstanding-search__empty">No customers found</div>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="form-hint mb-0">
                    {normalizedOutstandingCustomerSearch.length < 3 && !selectedOutstandingCustomer
                      ? 'Enter at least 3 characters to search customers'
                      : 'Select a customer to load only their payment ledger.'}
                  </p>
                </div>
                {selectedOutstandingCustomer ? (
                  <div className="customer-outstanding-card">
                    <div>
                      <span>Customer Name</span>
                      <strong>{getCustomerName(selectedOutstandingCustomer)}</strong>
                    </div>
                    <div>
                      <span>Phone</span>
                      <strong>{getCustomerPhone(selectedOutstandingCustomer) || '-'}</strong>
                    </div>
                    <div>
                      <span>Customer Code</span>
                      <strong>{getCustomerCode(selectedOutstandingCustomer) || '-'}</strong>
                    </div>
                    <div>
                      <span>Current Balance</span>
                      <strong className={getCustomerBalanceClassName(selectedOutstandingCustomerBalance)}>
                        {selectedOutstandingCustomerBalance === '-'
                          ? '-'
                          : formatCustomerBalance(selectedOutstandingCustomerBalance)}
                      </strong>
                    </div>
                  </div>
                ) : null}
              </section>
              {!selectedOutstandingCustomer ? (
                <EmptyState
                  eyebrow={customerModuleUi?.label}
                  title="Search and select a customer to view payment ledger"
                  description="Payment ledger records are hidden until a customer is selected."
                />
              ) : selectedCustomerOutstandingError && selectedCustomerOutstandingRows.length === 0 && !isSelectedCustomerOutstandingLoading ? (
                <ErrorState
                  eyebrow={customerModuleUi?.label}
                  title="Unable to load customer payment ledger"
                  description={selectedCustomerOutstandingError}
                />
              ) : selectedCustomerOutstandingRows.length === 0 && !isSelectedCustomerOutstandingLoading ? (
                <EmptyState
                  eyebrow={customerModuleUi?.label}
                  title="No payment ledger found"
                  description="This customer does not have ledger records yet."
                />
              ) : (
                <CustomerPaymentsTable
                  rows={selectedCustomerOutstandingRows}
                  isLoading={isSelectedCustomerOutstandingLoading}
                />
              )}
            </>
          ) : (
            customerBalanceError && customerOutstandingRows.length === 0 && !isCustomerOutstandingLoading ? (
              <ErrorState
                eyebrow={customerModuleUi?.label}
                title="Unable to load customer outstanding"
                description={customerBalanceError}
              />
            ) : customerOutstandingRows.length === 0 && !isCustomerOutstandingLoading ? (
              <EmptyState
                eyebrow={customerModuleUi?.label}
                title={getCustomerWorkspaceViewUi('outstanding').emptyTitle}
                description={getCustomerWorkspaceViewUi('outstanding').emptyDescription}
              />
            ) : (
              <CustomerOutstandingTable
                rows={customerOutstandingRows}
                isLoading={isCustomerOutstandingLoading}
                pagination={customerOutstandingPagination}
                onPageChange={customerOutstandingPagination?.onPageChange}
                onLimitChange={customerOutstandingPagination?.onLimitChange}
                onPay={openPayModal}
              />
            )
          )
        ) : (
          <PermissionState
            eyebrow={customerModuleUi?.label}
            title={customerModuleUi?.permissionTitle || 'Customer access is restricted'}
            description="This business can still add customers, but the customer list, payment list, and outstanding options stay hidden until those permissions are turned on."
            action={emptyAction}
          />
        )}
      </div>

      {renderSummaryCards(customerSummary)}
    </div>
  );
}
