'use client';

import SectionHero from '../SectionHero';
import DashboardCard from '../DashboardCard';
import QuickActions from '../QuickActions';
import NotificationCenter from '../NotificationCenter';
import WelcomeHero from '../WelcomeHero';
import CountersTable from '../../tables/CountersTable';
import RecentServicesTable from '../../tables/RecentServicesTable';
import TransactionTable from '../../tables/TransactionTable';
import { FaPlusCircle, FaDollarSign, FaHourglassHalf, FaUsers, FaCog, FaFilter } from 'react-icons/fa';
import type { DashboardTabContext } from './types';

interface DashboardTabProps {
  ctx: DashboardTabContext;
}

export default function DashboardTab({ ctx }: DashboardTabProps) {
  const {
    currentRole,
    dashboardSummary,
    isDashboardSummaryLoading,
    selectedCounter,
    visibleServices,
    recentServices,
    notifications,
    customerDirectoryRecords,
    handleQuickAction,
    handleDismissNotification,
    handlePayTransaction,
    handleViewTransaction,
    handlePrintReceipt,
    renderTransactionFilters,
    isTransactionFiltersOpen,
    hasActiveTransactionFilters,
    filteredTransactionRecords,
    canManageModule,
    canDeleteModule,
    canAccessModuleForSession,
    handleEditService,
    handleDeleteService,
    availableCounters,
    displayUserName,
    renderBusinessPlanSection,
    renderAdminDashboard,
  } = ctx;

  const isBusinessWorkspace = currentRole === 'Customer';
  const collectedAmount = dashboardSummary?.collectedAmount
    ?? filteredTransactionRecords.reduce((total, transaction) => total + transaction.paidAmount, 0);
  const pendingTransactions = dashboardSummary?.pendingTransactions
    ?? filteredTransactionRecords.filter((transaction) => transaction.status === 'pending').length;
  const customerCount = dashboardSummary?.customerCount ?? customerDirectoryRecords.length;
  const activeServiceCount = dashboardSummary?.activeServiceCount
    ?? visibleServices.filter((service) => service.status === 'Active').length;
  const showDashboardSummarySkeletons = isDashboardSummaryLoading && !dashboardSummary;

  const transactionFilterAction = (
    <div className="table-filter-trigger">
      <button type="button" className="btn-app btn-app-secondary" onClick={() => ctx.setIsTransactionFiltersOpen((current) => !current)}>
        <FaFilter />
        Filter
      </button>
      {hasActiveTransactionFilters ? (
        <span className="status-chip status-chip--info">Filtered</span>
      ) : null}
    </div>
  );

  if (currentRole === 'Admin') {
    return renderAdminDashboard();
  }

  const serviceSnapshotSection = canAccessModuleForSession(ctx.accessContext, 'services') ? (
    <div className="dashboard-section-block">
      <div className="panel p-4 p-lg-5">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Inventory Snapshot</p>
            <h2 className="panel-title">Most-used inventory</h2>
            <p className="panel-copy">
              {selectedCounter
                ? `A quick glance at the live inventory available in ${selectedCounter.name}.`
                : 'A quick glance at the live inventory operators can open right away.'}
            </p>
          </div>
          {canManageModule('services') && selectedCounter ? (
            <button type="button" className="btn-app btn-app-primary" onClick={() => handleQuickAction('add-service')}>
              <FaPlusCircle />
              Add Inventory
            </button>
          ) : null}
        </div>
        <div className="row g-4">
          {visibleServices.slice(0, 3).map((service) => (
            <div key={service.id} className="col-12 col-md-6 col-xl-4">
              <div className="metric-card summary-card--blue">
                <div className="d-flex justify-content-between gap-3">
                  <span className="status-chip status-chip--info">{service.type === 'product' ? 'Product' : 'Service'}</span>
                  <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                    {service.status}
                  </span>
                </div>
                <h3 className="h5 fw-semibold mt-4 mb-2">{service.name}</h3>
                <p className="metric-card__detail mb-4">{service.remark || service.description || 'No remark'}</p>
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <span className="fw-semibold text-primary">Qty. {service.quantity ?? 0}</span>
                  <div className="table-actions">
                    {canManageModule('services') ? (
                      <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => handleEditService(service)}>
                        Edit
                      </button>
                    ) : null}
                    {canDeleteModule('services') ? (
                      <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => handleDeleteService(service.id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  const recentActivitySection = (
    <div className="dashboard-section-stack">
      <div className="dashboard-section-block">
        <SectionHero
          eyebrow="Recent Activity"
          title="Counters and latest inventory"
          description="Keep an eye on active balances and the newest inventory transactions processed by the team."
        />
      </div>

      <div className="dashboard-section-block">
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <CountersTable counters={availableCounters} />
          </div>
          {canAccessModuleForSession(ctx.accessContext, 'services') && (
            <div className="col-12 col-lg-6">
              <RecentServicesTable services={recentServices} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page-stack">
      <WelcomeHero
        userName={displayUserName}
        role={currentRole}
        counterName={selectedCounter?.name || 'No counter selected'}
        counterStatus={selectedCounter?.status || 'Inactive'}
        onPrimaryAction={() => handleQuickAction('new-transaction')}
        onSecondaryAction={() => handleQuickAction('favorites')}
      />

      <section className="panel dashboard-kpi-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Workspace Overview</p>
            <h2 className="panel-title">Operating pulse</h2>
          </div>
        </div>
        <div className="dashboard-kpi-grid">
          <DashboardCard
            title="Collected Amount"
            value={`Rs. ${collectedAmount.toLocaleString('en-IN')}`}
            icon={<FaDollarSign />}
            color="green"
            loading={showDashboardSummarySkeletons}
          />
          <DashboardCard
            title="Pending Transactions"
            value={pendingTransactions}
            icon={<FaHourglassHalf />}
            color="orange"
            loading={showDashboardSummarySkeletons}
          />
          <DashboardCard
            title="Customers"
            value={customerCount}
            icon={<FaUsers />}
            color="blue"
            loading={showDashboardSummarySkeletons}
          />
          <DashboardCard
            title="Active Inventory"
            value={activeServiceCount}
            icon={<FaCog />}
            color="purple"
            loading={showDashboardSummarySkeletons}
          />
        </div>
      </section>

      <div className="dashboard-main-grid">
        <div className="dashboard-main-column">
          {isBusinessWorkspace ? renderBusinessPlanSection() : null}
          {isBusinessWorkspace ? null : serviceSnapshotSection}
          {isBusinessWorkspace ? null : recentActivitySection}

          {isTransactionFiltersOpen ? renderTransactionFilters() : null}

          <TransactionTable
            transactions={filteredTransactionRecords}
            onPay={handlePayTransaction}
            onView={handleViewTransaction}
            onPrint={handlePrintReceipt}
            headerAction={transactionFilterAction}
          />

          {isBusinessWorkspace ? serviceSnapshotSection : null}
          {isBusinessWorkspace ? recentActivitySection : null}
        </div>

        <aside className="dashboard-side-column">
          <QuickActions onAction={handleQuickAction} />
          <NotificationCenter
            notifications={notifications}
            onDismiss={handleDismissNotification}
          />
        </aside>
      </div>
    </div>
  );
}
