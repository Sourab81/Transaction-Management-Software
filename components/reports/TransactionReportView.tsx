'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getTransactionReport, type TransactionReportFilters } from '../../lib/api/transactions';
import {
  mapTransactionReportResponse,
  type TransactionReportRow,
} from '../../lib/mappers/transaction-report-mapper';
import DataTable, { type DataTableColumn } from '../tables/DataTable';
import { formatDate } from '../../src/utils/dateFormatter';
import type { DashboardTabContext } from '../dashboard/active-tab/types';

interface TransactionReportViewProps {
  ctx: DashboardTabContext;
}

const getTodayDateValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const formatMoney = (amount: number) => `\u20B9${amount.toLocaleString('en-IN')}`;

const today = getTodayDateValue();

export default function TransactionReportView({ ctx }: TransactionReportViewProps) {
  const { counters, employees } = ctx;

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<TransactionReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const deptRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setShowDepartmentDropdown(false);
      }
      if (staffRef.current && !staffRef.current.contains(e.target as Node)) {
        setShowStaffDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      const filters: TransactionReportFilters = {
        dateFrom,
        dateTo,
        pageNo: page,
        limit,
      };
      if (selectedDepartmentIds.length > 0) filters.counterIds = selectedDepartmentIds;
      if (selectedStaffIds.length > 0) filters.staffIds = selectedStaffIds;
      if (customerSearch.trim()) filters.customerSearch = customerSearch.trim();

      try {
        const payload = await getTransactionReport(filters);
        if (cancelled) return;
        const mapped = mapTransactionReportResponse(payload);
        setRows(mapped.data);
        setTotalRecords(mapped.pagination.totalRecords);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load transaction report.';
        setError(message);
        setRows([]);
        setTotalRecords(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, selectedDepartmentIds, selectedStaffIds, customerSearch, page, limit]);

  const toggleDepartment = (id: string) => {
    setSelectedDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
    setPage(1);
  };

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
    setPage(1);
  };

  const columns: Array<DataTableColumn<TransactionReportRow>> = useMemo(() => [
    {
      key: 'transactionId',
      header: 'T.ID',
      dataLabel: 'T.ID',
      render: (record) => <span>{record.transactionId}</span>,
    },
    {
      key: 'invoiceId',
      header: 'Invoice No.',
      dataLabel: 'Invoice No.',
      render: (record) => <span>{record.invoiceId}</span>,
    },
    {
      key: 'date',
      header: 'Transaction Date',
      dataLabel: 'Date',
      render: (record) => <span>{formatDate(record.date)}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      dataLabel: 'Customer',
      render: (record) => (
        <span>
          {record.customerName}
          <span className="text-muted ms-1">({record.customerCode || `#${record.customerId}`})</span>
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      dataLabel: 'Department',
      render: (record) => <span>{record.departmentName || '-'}</span>,
    },
    {
      key: 'formName',
      header: 'Form Name',
      dataLabel: 'Form Name',
      render: (record) => <span>{record.formName}</span>,
    },
    {
      key: 'noOfTransaction',
      header: 'No. of TXN',
      dataLabel: 'No. of TXN',
      render: (record) => <span>{record.noOfTransaction}</span>,
    },
    {
      key: 'service',
      header: 'Service',
      dataLabel: 'Service',
      render: (record) => <span>{record.inventoryName || '-'}</span>,
    },
    {
      key: 'accountName',
      header: 'TXN A/C',
      dataLabel: 'TXN A/C',
      render: (record) => <span>{record.accountName || '-'}</span>,
    },
    {
      key: 'serviceCharge',
      header: 'Service Charge',
      dataLabel: 'Service Charge',
      render: (record) => (
        <span>{record.serviceCharge > 0 ? formatMoney(record.serviceCharge) : '-'}</span>
      ),
    },
    {
      key: 'bankCharge',
      header: 'Bank Charge',
      dataLabel: 'Bank Charge',
      render: (record) => (
        <span>{record.bankCharge > 0 ? formatMoney(record.bankCharge) : '-'}</span>
      ),
    },
    {
      key: 'otherCharge',
      header: 'Other Charge',
      dataLabel: 'Other Charge',
      render: (record) => (
        <span>{record.otherCharge > 0 ? formatMoney(record.otherCharge) : '-'}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      dataLabel: 'Total',
      render: (record) => <span className="fw-semibold">{formatMoney(record.totalAmount)}</span>,
    },
    {
      key: 'remark',
      header: 'Remark',
      dataLabel: 'Remark',
      render: (record) => <span>{record.remark || '-'}</span>,
    },
    {
      key: 'addedByName',
      header: 'Added By',
      dataLabel: 'Added By',
      render: (record) => <span>{record.addedByName || '-'}</span>,
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

          <div className="position-relative" ref={deptRef}>
            <label className="form-label small mb-1">Department</label>
            <button
              type="button"
              className="form-control form-control-sm text-start d-flex align-items-center justify-content-between"
              style={{ minWidth: 180 }}
              onClick={() => { setShowDepartmentDropdown((v) => !v); setShowStaffDropdown(false); }}
            >
              <span>
                {selectedDepartmentIds.length > 0
                  ? `${selectedDepartmentIds.length} department${selectedDepartmentIds.length > 1 ? 's' : ''} selected`
                  : 'All Departments'}
              </span>
              <span className="ms-2">{showDepartmentDropdown ? '\u25B2' : '\u25BC'}</span>
            </button>
            {showDepartmentDropdown && (
              <div
                className="position-absolute bg-white border rounded shadow-sm p-2 z-3"
                style={{ minWidth: 220, maxHeight: 260, overflowY: 'auto', top: '100%', left: 0 }}
              >
                {counters
                  .filter((c) => c.status === 'Active')
                  .map((c) => (
                    <label key={c.id} className="d-flex align-items-center gap-2 py-1 px-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDepartmentIds.includes(c.id)}
                        onChange={() => toggleDepartment(c.id)}
                      />
                      <span className="small">{c.name}</span>
                    </label>
                  ))}
                {counters.filter((c) => c.status === 'Active').length === 0 && (
                  <span className="small text-muted">No departments available</span>
                )}
              </div>
            )}
          </div>

          <div className="position-relative" ref={staffRef}>
            <label className="form-label small mb-1">Added By</label>
            <button
              type="button"
              className="form-control form-control-sm text-start d-flex align-items-center justify-content-between"
              style={{ minWidth: 180 }}
              onClick={() => { setShowStaffDropdown((v) => !v); setShowDepartmentDropdown(false); }}
            >
              <span>
                {selectedStaffIds.length > 0
                  ? `${selectedStaffIds.length} user${selectedStaffIds.length > 1 ? 's' : ''} selected`
                  : 'All Users'}
              </span>
              <span className="ms-2">{showStaffDropdown ? '\u25B2' : '\u25BC'}</span>
            </button>
            {showStaffDropdown && (
              <div
                className="position-absolute bg-white border rounded shadow-sm p-2 z-3"
                style={{ minWidth: 220, maxHeight: 260, overflowY: 'auto', top: '100%', left: 0 }}
              >
                {employees.map((e) => (
                  <label key={e.id} className="d-flex align-items-center gap-2 py-1 px-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(e.id)}
                      onChange={() => toggleStaff(e.id)}
                    />
                    <span className="small">{e.name || e.displayName}</span>
                  </label>
                ))}
                {employees.length === 0 && (
                  <span className="small text-muted">No users available</span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="form-label small mb-1">Customer</label>
            <input
              ref={searchRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setPage(1); }}
              style={{ minWidth: 180 }}
            />
          </div>
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(r) => `${r.transactionId}_${r.formName}_${r.noOfTransaction}`}
          emptyLabel="No transaction records found for the selected criteria."
          isLoading={isLoading}
          error={error}
          pagination={pagination}
        />
      </div>
    </div>
  );
}
