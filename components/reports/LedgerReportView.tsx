'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaChartBar, FaFileInvoiceDollar, FaMoneyBillWave } from 'react-icons/fa';
import { getLedgerReport, type LedgerEntry, type LedgerReportData } from '../../lib/api/reports';
import DataTable from '../tables/DataTable';
import { formatDate } from '../../src/utils/dateFormatter';
import type { DashboardTabContext } from '../dashboard/active-tab/types';
import type { SummaryCardProps } from '../dashboard/SummaryCard';

interface LedgerReportViewProps {
  ctx: DashboardTabContext;
}

const getTodayDateValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const formatMoney = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const today = getTodayDateValue();

interface FetchParams {
  dateFrom: string;
  dateTo: string;
  entityIds: string[];
  page: number;
  limit: number;
}

export default function LedgerReportView({ ctx }: LedgerReportViewProps) {
  const { counters, accounts, renderSummaryCards, showNotification } = ctx;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [reportData, setReportData] = useState<LedgerReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchParams, setFetchParams] = useState<FetchParams>({
    dateFrom: today,
    dateTo: today,
    entityIds: [],
    page: 1,
    limit: 10,
  });

  const setDateFrom = (dateFrom: string) => {
    setFetchParams((prev) => ({ ...prev, dateFrom, page: 1 }));
  };

  const setDateTo = (dateTo: string) => {
    setFetchParams((prev) => ({ ...prev, dateTo, page: 1 }));
  };

  const toggleEntity = (id: string) => {
    setFetchParams((prev) => {
      const entityIds = prev.entityIds.includes(id)
        ? prev.entityIds.filter((v) => v !== id)
        : [...prev.entityIds, id];
      return { ...prev, entityIds, page: 1 };
    });
  };

  const handlePageChange = (newPage: number) => {
    setFetchParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setFetchParams((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  useEffect(() => {
    const counterIds = fetchParams.entityIds.filter((id) => id.startsWith('ctr_')).map((id) => id.replace('ctr_', ''));
    const accountIds = fetchParams.entityIds.filter((id) => id.startsWith('acc_')).map((id) => id.replace('acc_', ''));
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await getLedgerReport({
          dateFrom: fetchParams.dateFrom,
          dateTo: fetchParams.dateTo,
          counterIds,
          accountIds,
          page: fetchParams.page,
          limit: fetchParams.limit,
        });

        if (cancelled) return;
        if (!response.status) throw new Error(response.message);
        setReportData(response.data);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unable to fetch ledger report.';
        setError(message);
        showNotification('error', message);
        setReportData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => { cancelled = true; };
  }, [fetchParams, showNotification]);

  const selectedLabel = useMemo(() => {
    const count = fetchParams.entityIds.length;
    if (count === 0) return 'All Banks & Departments';
    return `${count} selected`;
  }, [fetchParams.entityIds]);

  const summaryCards = useMemo<SummaryCardProps[]>(() => {
    if (!reportData) return [];
    const { summary } = reportData;
    return [
      {
        title: 'Total Debit',
        value: formatMoney(summary.totalDebit),
        detail: 'Total outflows',
        icon: <FaMoneyBillWave />,
        colorClass: 'bg-warning',
      },
      {
        title: 'Total Credit',
        value: formatMoney(summary.totalCredit),
        detail: 'Total inflows',
        icon: <FaChartBar />,
        colorClass: 'bg-success',
      },
      {
        title: 'Closing Balance',
        value: formatMoney(summary.closingBalance),
        detail: 'As of end of date range',
        icon: <FaFileInvoiceDollar />,
        colorClass: summary.closingBalance >= 0 ? 'bg-info' : 'bg-danger',
      },
    ];
  }, [reportData]);

  const entries = useMemo(() => reportData?.records || [], [reportData]);

  const pagination = useMemo(() => {
    if (!reportData) return undefined;
    const p = reportData.pagination;
    return {
      currentPage: p.currentPage,
      totalPages: p.totalPages,
      totalRecords: p.totalRecords,
      limit: p.limit,
      isLoading,
      onPageChange: handlePageChange,
      onLimitChange: handleLimitChange,
    };
  }, [reportData, isLoading]);

  const columns = useMemo(() => [
    {
      key: 'serial',
      header: '#',
      render: (_record: LedgerEntry, index: number) => index + 1 + (fetchParams.page - 1) * fetchParams.limit,
    },
    {
      key: 'date',
      header: 'Date',
      dataLabel: 'Date',
      render: (record: LedgerEntry) => formatDate(record.entryDate),
    },
    {
      key: 'customer',
      header: 'Customer / ID',
      dataLabel: 'Customer',
      render: (record: LedgerEntry) => (
        <span className="data-table__primary">{record.customerCode ? `${record.customerCode} / ${record.customer}` : (record.customer || ' - ')}</span>
      ),
    },
    {
      key: 'entity',
      header: 'Bank / Department',
      dataLabel: 'Bank/Department',
      render: (record: LedgerEntry) => (
        <span>{record.entityName}</span>
      ),
    },
    {
      key: 'debit',
      header: 'Debit',
      dataLabel: 'Debit',
      render: (record: LedgerEntry) => (
        <span className="text-danger fw-semibold">
          {record.debit > 0 ? formatMoney(record.debit) : '-'}
        </span>
      ),
    },
    {
      key: 'credit',
      header: 'Credit',
      dataLabel: 'Credit',
      render: (record: LedgerEntry) => (
        <span className="text-success fw-semibold">
          {record.credit > 0 ? formatMoney(record.credit) : '-'}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      dataLabel: 'Balance',
      render: (record: LedgerEntry) => (
        <span className={record.balance >= 0 ? '' : 'text-danger'}>
          {formatMoney(record.balance)}
        </span>
      ),
    },
    {
      key: 'remark',
      header: 'Remark',
      dataLabel: 'Remark',
      render: (record: LedgerEntry) => {
        const parts = [record.sourceType];
        if (record.otherEntityName) parts.push(record.otherEntityName);
        if (record.remark) parts.push(record.remark);
        return <span className="text-muted small">{parts.join(' / ')}</span>;
      },
    },
    {
      key: 'addedBy',
      header: 'Added By',
      dataLabel: 'Added By',
      render: (record: LedgerEntry) => record.addedByName,
    },
  ], [fetchParams.page, fetchParams.limit]);

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="form-section-card">
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
            <div>
              <p className="eyebrow mb-1">Filters</p>
              <h3 className="table-panel__title mb-0">Bank / Department Ledger</h3>
            </div>
            <div className="d-flex flex-wrap align-items-end gap-3">
              <label className="table-toolbar__field">
                <span>From</span>
                <input
                  type="date"
                  className="form-control"
                  value={fetchParams.dateFrom}
                  max={fetchParams.dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label className="table-toolbar__field">
                <span>To</span>
                <input
                  type="date"
                  className="form-control"
                  value={fetchParams.dateTo}
                  min={fetchParams.dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              <div className="table-filter-dropdown">
                <button
                  type="button"
                  className="form-select table-filter-dropdown__button"
                  aria-expanded={isDropdownOpen}
                  onClick={() => setIsDropdownOpen((v) => !v)}
                >
                  <span>{selectedLabel}</span>
                </button>
                {isDropdownOpen ? (
                  <div className="table-filter-options table-filter-dropdown__menu">
                    {counters.length === 0 && accounts.length === 0 ? (
                      <div className="table-filter-option text-muted small px-3 py-2">No entities available</div>
                    ) : (
                      <>
                        {counters.length > 0 ? (
                          <div className="table-filter-option table-filter-option--header px-3 py-1">
                            <span className="text-muted small fw-semibold text-uppercase">Departments</span>
                          </div>
                        ) : null}
                        {counters.map((counter) => {
                          const id = `ctr_${counter.id}`;
                          return (
                            <label key={id} className="table-filter-option">
                              <input
                                type="checkbox"
                                checked={fetchParams.entityIds.includes(id)}
                                onChange={() => toggleEntity(id)}
                              />
                              <span>{counter.code ? `${counter.code} / ${counter.name}` : counter.name}</span>
                            </label>
                          );
                        })}
                        {accounts.length > 0 ? (
                          <div className="table-filter-option table-filter-option--header px-3 py-1">
                            <span className="text-muted small fw-semibold text-uppercase">Banks</span>
                          </div>
                        ) : null}
                        {accounts.map((account) => {
                          const id = `acc_${account.id}`;
                          return (
                            <label key={id} className="table-filter-option">
                              <input
                                type="checkbox"
                                checked={fetchParams.entityIds.includes(id)}
                                onChange={() => toggleEntity(id)}
                              />
                              <span>{account.bankName} - {account.accountHolder}</span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="col-12">
          <div className="form-alert" role="alert">{error}</div>
        </div>
      ) : null}

     

      <div className="col-12">
        <DataTable
          rows={entries}
          columns={columns}
          getRowKey={(record) => `${record.entityType}_${record.entityId}_${record.entryDate}_${record.debit}_${record.credit}`}
          eyebrow="Ledger"
          title="Bank / Department Report"
          copy="Chronological ledger of all financial activity for selected entities."
          emptyLabel="No ledger entries found for the selected filters."
          isLoading={isLoading}
          pagination={pagination}
        />
      </div>

       <div className="col-12">
        {renderSummaryCards(summaryCards)}
      </div>

    </div>
  );
}
