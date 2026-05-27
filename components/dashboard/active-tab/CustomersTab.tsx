'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaFilter, FaPlusCircle } from 'react-icons/fa';
import { getCustomerWorkspaceViewUi, getModuleUi } from '../../../lib/module-ui';
import { customerPermissionOptions } from '../../../lib/platform-structure';
import { getCustomerWorkspacePath } from '../../../lib/workspace-routes';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../../lib/customer-balance-format';
import ActionModal from '../../ui/ActionModal';
import EmptyState from '../../ui/state/EmptyState';
import ErrorState from '../../ui/state/ErrorState';
import PermissionState from '../../ui/state/PermissionState';
import SectionHero from '../SectionHero';
import CustomersTable from '../../tables/CustomersTable';
import CustomerPaymentsTable from '../../tables/CustomerPaymentsTable';
import CustomerOutstandingTable from '../../tables/CustomerOutstandingTable';
import DataTableFilters, { type DataTableFiltersConfig } from '../../common/DataTableFilters';
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
    customerBalanceRows,
    isCustomersLoading,
    isTransactionsLoading,
    isCustomerBalanceLoading,
    customerBalanceError,
    handleViewCustomerHistory,
    handleEditCustomer,
    handleCustomerBalancePayment,
    selectedCounter,
    accounts,
    canEditCustomerRecords,
    handleDeleteRecord,
    canDeleteCustomerRecords,
    renderCustomerRoutePermissionState,
    handleQuickAction,
    businessDirectoryFilters,
    setBusinessDirectoryFilters,
    businessPermissionFilterLabel,
    hasActiveBusinessDirectoryFilters,
    isBusinessDirectoryLoading,
    businessDirectoryError,
    customerDirectoryPagination,
    roleTemplates,
  } = ctx;
  const [isBusinessFilterOpen, setIsBusinessFilterOpen] = useState(false);
  const [draftBusinessFilters, setDraftBusinessFilters] = useState(businessDirectoryFilters);
  const [payingBalance, setPayingBalance] = useState<CustomerBalance | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'account'>('cash');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isPayingBalance, setIsPayingBalance] = useState(false);
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
      {
        field: 'status',
        label: 'Status',
        type: 'single-select',
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
        ],
      },
      {
        field: 'joinedDate',
        label: 'Joined date',
        type: 'date-range',
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
  const isCustomerPaymentsLoading = currentRole !== 'Admin' && isCustomerBalanceLoading;
  const isCustomerOutstandingLoading = currentRole !== 'Admin' && (isCustomersLoading || isTransactionsLoading);
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
  const openPayModal = (balance: CustomerBalance) => {
    setPayingBalance(balance);
    setPaymentAmount('');
    setPaymentMode('cash');
    setPaymentAccountId('');
    setPaymentRemark('');
    setPaymentError('');
  };
  const closePayModal = () => {
    if (isPayingBalance) return;
    setPayingBalance(null);
    setPaymentError('');
  };
  const submitBalancePayment = async () => {
    if (!payingBalance) return;

    const numericAmount = Number(paymentAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setPaymentError('Enter a valid payment amount.');
      return;
    }

    if (paymentMode === 'account' && !paymentAccountId) {
      setPaymentError('Select an account for account payment.');
      return;
    }

    setIsPayingBalance(true);
    const success = await handleCustomerBalancePayment({
      customerId: payingBalance.customerId,
      paymentAmount: numericAmount,
      paymentMode,
      accountId: paymentMode === 'account' ? paymentAccountId : null,
      counterId: selectedCounter?.id || null,
      remark: paymentRemark.trim() || null,
    });
    setIsPayingBalance(false);

    if (success) {
      closePayModal();
    }
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
        <ActionModal
          title="Pay Customer Balance"
          eyebrow="Customer Payment"
          description={`Collect payment for ${payingBalance.customerName || `Customer #${payingBalance.customerId}`}.`}
          onClose={closePayModal}
        >
          {paymentError ? (
            <div className="form-alert" role="alert">{paymentError}</div>
          ) : null}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="customer-balance-current-balance">Current Balance</label>
              <input
                className={`form-control ${getCustomerBalanceClassName(payingBalance.currentBalanceStatus)}`}
                id="customer-balance-current-balance"
                value={formatCustomerBalance(payingBalance.currentBalanceStatus)}
                readOnly
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="customer-balance-payment-amount">Payment Amount</label>
              <input
                className="form-control"
                id="customer-balance-payment-amount"
                min="0"
                type="number"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="customer-balance-payment-mode">Payment Mode</label>
              <select
                className="form-select"
                id="customer-balance-payment-mode"
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value as 'cash' | 'account')}
              >
                <option value="cash">Cash</option>
                <option value="account">Account</option>
              </select>
            </div>
            {paymentMode === 'account' ? (
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="customer-balance-payment-account">Account</label>
                <select
                  className="form-select"
                  id="customer-balance-payment-account"
                  value={paymentAccountId}
                  onChange={(event) => setPaymentAccountId(event.target.value)}
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountHolder} | {account.bankName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="col-12">
              <label className="form-label" htmlFor="customer-balance-payment-remark">Remark Optional</label>
              <input
                className="form-control"
                id="customer-balance-payment-remark"
                value={paymentRemark}
                onChange={(event) => setPaymentRemark(event.target.value)}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={closePayModal} disabled={isPayingBalance}>
              Cancel
            </button>
            <button type="button" className="btn-app btn-app-primary" onClick={submitBalancePayment} disabled={isPayingBalance}>
              {isPayingBalance ? 'Paying...' : 'Pay'}
            </button>
          </div>
        </ActionModal>
      ) : null}

      <div className="col-12">
        <SectionHero
          eyebrow={currentRole === 'Admin' ? 'User Hub' : 'Customer Hub'}
          title={customerSectionTitle}
          description={customerSectionDescription}
          action={canAddCustomerRecords ? {
            label: `Add ${customerEntityLabel}`,
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-customer'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(customerSummary)}

      {currentRole !== 'Admin' && customerPageOptions.length > 0 ? (
        <div className="col-12">
          <section className="panel p-4">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Customer Options</p>
                <h2 className="panel-title">Choose what you want to review</h2>
                <p className="panel-copy">Switch between the customer directory, payment list, and outstanding balances based on your assigned permissions.</p>
              </div>
            </div>
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
                emptyLabel={`No ${customerEntityLabel.toLowerCase()} records found.`}
                isLoading={isCustomerDirectoryLoading}
                pagination={currentRole === 'Admin' ? customerDirectoryPagination : undefined}
                headerAction={businessFilterAction}
                showRoleColumn={currentRole === 'Admin'}
                roleTemplates={roleTemplates}
                onView={currentRole === 'Admin' ? undefined : handleViewCustomerHistory}
                onEdit={canEditCustomerRecords ? handleEditCustomer : undefined}
                onDelete={currentRole !== 'Admin' && canDeleteCustomerRecords ? (id: string) => handleDeleteRecord('DELETE_CUSTOMER', id) : undefined}
              />
            )
          ) : customerPageView === 'payments' ? (
            customerBalanceError && customerBalanceRows.length === 0 && !isCustomerPaymentsLoading ? (
              <ErrorState
                eyebrow={customerModuleUi?.label}
                title="Unable to load customer payment list"
                description={customerBalanceError}
              />
            ) : customerBalanceRows.length === 0 && !isCustomerPaymentsLoading ? (
              <EmptyState
                eyebrow={customerModuleUi?.label}
                title={getCustomerWorkspaceViewUi('payments').emptyTitle}
                description={getCustomerWorkspaceViewUi('payments').emptyDescription}
              />
            ) : (
              <CustomerPaymentsTable
                balances={customerBalanceRows}
                isLoading={isCustomerPaymentsLoading}
                onPay={openPayModal}
              />
            )
          ) : (
            customerOutstandingRows.length === 0 && !isCustomerOutstandingLoading ? (
              <EmptyState
                eyebrow={customerModuleUi?.label}
                title={getCustomerWorkspaceViewUi('outstanding').emptyTitle}
                description={getCustomerWorkspaceViewUi('outstanding').emptyDescription}
              />
            ) : (
              <CustomerOutstandingTable
                rows={customerOutstandingRows}
                isLoading={isCustomerOutstandingLoading}
                onView={handleViewCustomerHistory}
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
    </div>
  );
}
