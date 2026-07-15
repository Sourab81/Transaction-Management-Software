'use client';

import { useEffect, useMemo, useState } from 'react';
import { getActivityLogs, type ActivityLogFilters } from '../../lib/api/activity-logs';
import {
  mapActivityLogResponse,
  type ActivityLogRow,
} from '../../lib/mappers/activity-log-mapper';
import DataTable, { type DataTableColumn } from '../tables/DataTable';
import KeyValueList from './KeyValueList';

const getTodayDateValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const LOG_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'customer', label: 'Customer' },
  { value: 'expense', label: 'Expense' },
  { value: 'employee', label: 'Employee' },
  { value: 'payment', label: 'Payment' },
  { value: 'department', label: 'Department' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'cash_deposit', label: 'Cash Deposit' },
  { value: 'balance_transfer', label: 'Balance Transfer' },
  { value: 'balance_update', label: 'Balance Update' },
  { value: 'auth', label: 'Auth' },
];

const OPERATIONS = [
  { value: '', label: 'All Operations' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
];

function JsonPreview({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false);
  if (data === null || data === undefined) return <span className="text-muted">-</span>;
  return (
    <div style={{ maxWidth: 300 }}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary py-0 px-1"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Hide' : 'Show'}
      </button>
      {expanded && (
        <div className="mt-1 mb-0 border rounded p-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
          <KeyValueList data={data} />
        </div>
      )}
    </div>
  );
}

const today = getTodayDateValue();

export default function LogReportView() {
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [logType, setLogType] = useState('');
  const [operation, setOperation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (dateFrom > dateTo) {
        setRows([]);
        setTotalRecords(0);
        return;
      }
      setIsLoading(true);
      setError('');

      const filters: ActivityLogFilters = {
        dateFrom,
        dateTo,
        pageNo: page,
        limit,
      };
      if (logType) filters.logType = logType;
      if (operation) filters.operation = operation;

      try {
        const payload = await getActivityLogs(filters);
        if (cancelled) return;
        const mapped = mapActivityLogResponse(payload);
        setRows(mapped.data);
        setTotalRecords(mapped.pagination.totalRecords);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load activity logs.';
        setError(message);
        setRows([]);
        setTotalRecords(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, logType, operation, page, limit]);

  const columns: Array<DataTableColumn<ActivityLogRow>> = useMemo(() => [
    {
      key: 'addedDate',
      header: 'Date/Time',
      dataLabel: 'Date/Time',
      render: (record) => <span className="small">{record.addedDate || '-'}</span>,
    },
    {
      key: 'userName',
      header: 'User',
      dataLabel: 'User',
      render: (record) => (
        <span>
          {record.userName || '-'}
          <span className="text-muted ms-1 small">({record.userType})</span>
        </span>
      ),
    },
    {
      key: 'logType',
      header: 'Type',
      dataLabel: 'Type',
      render: (record) => <span className="text-capitalize">{record.logType.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'operation',
      header: 'Operation',
      dataLabel: 'Operation',
      render: (record) => {
        const colorMap: Record<string, string> = {
          CREATE: 'text-success',
          UPDATE: 'text-primary',
          DELETE: 'text-danger',
          LOGIN: 'text-info',
          LOGOUT: 'text-secondary',
        };
        return <span className={`fw-semibold ${colorMap[record.operation] || ''}`}>{record.operation}</span>;
      },
    },
    {
      key: 'reference',
      header: 'Reference',
      dataLabel: 'Reference',
      render: (record) => (
        <span className="small">
          {record.referenceType ? `${record.referenceType}#${record.referenceId ?? ''}` : '-'}
        </span>
      ),
    },
    {
      key: 'remark',
      header: 'Remark',
      dataLabel: 'Remark',
      render: (record) => <span className="small">{record.remark || '-'}</span>,
    },
    {
      key: 'ipAddress',
      header: 'IP',
      dataLabel: 'IP',
      render: (record) => <span className="small text-muted">{record.ipAddress || '-'}</span>,
    },
    {
      key: 'osType',
      header: 'OS',
      dataLabel: 'OS',
      render: (record) => <span className="small">{record.osType || '-'}</span>,
    },
    {
      key: 'beforeData',
      header: 'Before',
      dataLabel: 'Before',
      render: (record) => <JsonPreview data={record.beforeData} />,
    },
    {
      key: 'afterData',
      header: 'After',
      dataLabel: 'After',
      render: (record) => <JsonPreview data={record.afterData} />,
    },
  ], []);

  const pagination = useMemo(() => ({
    currentPage: page,
    totalPages,
    totalRecords,
    limit,
    isLoading,
    onPageChange: (newPage: number) => setPage(newPage),
    onLimitChange: (newLimit: number) => { setLimit(newLimit); setPage(1); },
  }), [page, totalPages, totalRecords, limit, isLoading]);

  return (
    <div className="col-12">
      <div className="form-section-card">
        <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
          <div>
            <label className="form-label small mb-1">From</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="form-label small mb-1">To</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="form-label small mb-1">Type</label>
            <select
              className="form-select form-select-sm"
              value={logType}
              onChange={(e) => { setLogType(e.target.value); setPage(1); }}
              style={{ minWidth: 160 }}
            >
              {LOG_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">Operation</label>
            <select
              className="form-select form-select-sm"
              value={operation}
              onChange={(e) => { setOperation(e.target.value); setPage(1); }}
              style={{ minWidth: 140 }}
            >
              {OPERATIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(r) => String(r.id)}
          emptyLabel="No activity logs found for the selected criteria."
          isLoading={isLoading}
          error={error}
          pagination={pagination}
        />
      </div>
    </div>
  );
}
