'use client';

import { useMemo, useState } from 'react';
import { FaEdit } from 'react-icons/fa';
import {
  type BalanceUpdateMode,
} from '../../../lib/api/balanceUpdates';
import { useBalanceUpdates } from '../../../lib/hooks/useBalanceUpdates';
import BalanceUpdatesTable from '../../tables/BalanceUpdatesTable';
import BalanceBatchEditTable from '../../tables/BalanceBatchEditTable';
import type { DashboardTabContext } from './types';

interface BalanceUpdateTabProps {
  ctx: DashboardTabContext;
}

const getTodayDateValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

export default function BalanceUpdateTab({ ctx }: BalanceUpdateTabProps) {
  const {
    accounts,
    counters,
    showNotification,
    reloadAccounts,
    reloadDepartments,
  } = ctx;
  const [mode, setMode] = useState<BalanceUpdateMode>('department');
  const [dateFrom, setDateFrom] = useState(getTodayDateValue);
  const [dateTo, setDateTo] = useState(getTodayDateValue);
  const [view, setView] = useState<'list' | 'batch'>('list');
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

  const handleBatchSaveSuccess = () => {
    setView('list');
    reload();
    reloadAccounts();
    reloadDepartments();
  };

  const handleCancelBatch = () => {
    setView('list');
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
                      onChange={() => setMode('department')}
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
                      onChange={() => setMode('account')}
                    />
                    Account
                  </label>
                </div>
              </div>
              {view === 'list' ? (
                <>
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
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {view === 'list' ? (
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
                onClick={() => setView('batch')}
                style={!ctx.canPerformModuleAction('accounts', 'edit') ? { display: 'none' } : undefined}
              >
                <FaEdit />
                Update
              </button>
            )}
          />
          {mode === 'account' && ctx.accountsError ? <p className="text-danger small mt-2 mb-0">{ctx.accountsError}</p> : null}
        </div>
      ) : (
        <div className="col-12">
          <BalanceBatchEditTable
            key={`balance-batch-${mode}`}
            mode={mode}
            counters={activeDepartments}
            accounts={activeAccounts}
            onSave={handleBatchSaveSuccess}
            onCancel={handleCancelBatch}
            showNotification={showNotification}
          />
        </div>
      )}
    </div>
  );
}
