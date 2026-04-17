'use client';

import SectionHero from '../SectionHero';
import DashboardCard from '../DashboardCard';
import QuickActions from '../QuickActions';
import NotificationCenter from '../NotificationCenter';
import WelcomeHero from '../WelcomeHero';
import CountersTable from '../../tables/CountersTable';
import RecentServicesTable from '../../tables/RecentServicesTable';
import TransactionTable from '../../tables/TransactionTable';
import { FaPlusCircle, FaDollarSign, FaHourglassHalf, FaUsers, FaChartLine } from 'react-icons/fa';

interface DashboardTabProps {
  ctx: any;
}

export default function DashboardTab({ ctx }: DashboardTabProps) {
  const {
    currentRole,
    selectedCounter,
    visibleServices,
    recentServices,
    notifications,
    handleQuickAction,
    handleDismissNotification,
    handleViewTransaction,
    handleDeleteRecord,
    renderTransactionFilters,
    isTransactionFiltersOpen,
    filteredTransactionRecords,
    visibleTransactionHistory,
    canManageModule,
    canDeleteModule,
    canAccessModuleForSession,
    canEmployeeOperateOnDepartment,
    handleEditService,
    handleDeleteService,
    availableCounters,
    displayUserName,
    renderBusinessPlanSection,
    renderAdminDashboard,
  } = ctx;

  const isBusinessWorkspace = currentRole === 'Customer';

  if (currentRole === 'Admin') {
    return renderAdminDashboard();
  }

  const serviceSnapshotSection = canAccessModuleForSession(ctx.accessContext, 'services') ? (
    <div className="col-12">
      <div className="panel p-4 p-lg-5">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Service Snapshot</p>
            <h2 className="panel-title">Most-used services</h2>
            <p className="panel-copy">
              {selectedCounter
                ? `A quick glance at the live services available in ${selectedCounter.name}.`
                : 'A quick glance at the live services operators can open right away.'}
            </p>
          </div>
          {canManageModule('services') && canEmployeeOperateOnDepartment ? (
            <button type="button" className="btn-app btn-app-primary" onClick={() => handleQuickAction('add-service')}>
              <FaPlusCircle />
              Add Service
            </button>
          ) : null}
        </div>
        <div className="row g-4">
          {visibleServices.slice(0, 3).map((service: any) => (
            <div key={service.id} className="col-12 col-md-6 col-xl-4">
              <div className="metric-card summary-card--blue">
                <div className="d-flex justify-content-between gap-3">
                  <span className="status-chip status-chip--info">{service.category}</span>
                  <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                    {service.status}
                  </span>
                </div>
                <h3 className="h5 fw-semibold mt-4 mb-2">{service.name}</h3>
                <p className="metric-card__detail mb-4">{service.description}</p>
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <span className="fw-semibold text-primary">Rs. {service.price.toLocaleString('en-IN')}</span>
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
    <>
      <div className="col-12">
        <SectionHero
          eyebrow="Recent Activity"
          title="Counters and latest services"
          description="Keep an eye on active balances and the newest services processed by the team."
        />
      </div>

      <div className="col-12">
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
    </>
  );

  return (
    <div className="row g-4">
      <div className="col-12">
        <WelcomeHero
          userName={displayUserName}
          role={currentRole}
          counterName={selectedCounter?.name || 'No counter selected'}
          counterStatus={selectedCounter?.status || 'Inactive'}
          onPrimaryAction={() => handleQuickAction('new-transaction')}
          onSecondaryAction={() => handleQuickAction('favorites')}
        />
      </div>

      {isBusinessWorkspace ? null : serviceSnapshotSection}

      <div className="col-12">
        <div className="panel p-4 p-lg-5">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Today Overview</p>
              <h2 className="panel-title">Operating pulse</h2>
            </div>
          </div>
          <div className="row g-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <DashboardCard
                title="Today Earnings"
                value="Rs. 1,250"
                icon={<FaDollarSign />}
                trend={{ value: 12, isPositive: true }}
                color="green"
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <DashboardCard
                title="Pending Tasks"
                value="8"
                icon={<FaHourglassHalf />}
                trend={{ value: 5, isPositive: false }}
                color="orange"
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <DashboardCard
                title="Active Users"
                value="24"
                icon={<FaUsers />}
                color="blue"
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <DashboardCard
                title="Total Transactions"
                value="156"
                icon={<FaChartLine />}
                trend={{ value: 8, isPositive: true }}
                color="purple"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="row g-4">
          <div className="col-12 col-lg-6 dashboard-balance-col">
            <QuickActions onAction={handleQuickAction} />
          </div>
          <div className="col-12 col-lg-6 dashboard-balance-col">
            <NotificationCenter
              notifications={notifications}
              onDismiss={handleDismissNotification}
            />
          </div>
        </div>
      </div>

      {isBusinessWorkspace ? null : recentActivitySection}

      <div className="col-12">
        <SectionHero
          eyebrow="Transactions"
          title="Transaction history"
          description="Review recent customer activity and open a record when you need more detail."
          action={canManageModule('transactions') && canEmployeeOperateOnDepartment ? {
            label: 'Add Transaction',
            icon: <FaPlusCircle />, 
            onClick: () => handleQuickAction('new-transaction'),
          } : undefined}
        />
      </div>

      {isTransactionFiltersOpen ? renderTransactionFilters() : null}

      <div className="col-12">
        <TransactionTable
          transactions={filteredTransactionRecords}
          onView={handleViewTransaction}
          onDelete={canDeleteModule('transactions') ? (id: string) => handleDeleteRecord('DELETE_TRANSACTION', id) : undefined}
          onToggleFilters={() => ctx.setIsTransactionFiltersOpen((current: boolean) => !current)}
          isFilterOpen={isTransactionFiltersOpen}
        />
      </div>
    </div>
  );
}
