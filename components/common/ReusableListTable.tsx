'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { PAGE_SIZE_OPTIONS } from '../../lib/hooks/usePersistentPageSize';
import { SkeletonTable } from '../ui/Skeleton';

export interface ReusableListTableColumn<TRecord> {
  key: string;
  header: string;
  dataLabel?: string;
  render: (record: TRecord, index: number) => React.ReactNode;
}

export interface ReusableListTablePagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showPageSize?: boolean;
  showDateFilter?: boolean;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (date: string) => void;
  onDateToChange?: (date: string) => void;
}

export interface ReusableListTableProps<TRecord> {
  data: TRecord[];
  columns: Array<ReusableListTableColumn<TRecord>>;
  rowKey: (record: TRecord) => string;
  loading?: boolean;
  error?: string;
  emptyMessage: string;
  eyebrow?: string;
  title?: string;
  copy?: string;
  headerAction?: React.ReactNode;
  actionsLabel?: string;
  renderActions?: (record: TRecord) => React.ReactNode;
  onRowClick?: (record: TRecord) => void;
  className?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  mobileCards?: boolean;
  stickyHeader?: boolean;
  scrollable?: boolean;
  pagination?: ReusableListTablePagination;
}

const DATE_FIELD_NAMES = [
  'date',
  'transactionDate',
  'addedDate',
  'createdDate',
  'createdAt',
  'joinedDate',
  'updatedAt',
  'paymentDate',
  'expenseDate',
];

const readRecordDate = <TRecord,>(record: TRecord) => {
  if (!record || typeof record !== 'object') return '';

  const source = record as Record<string, unknown>;
  for (const field of DATE_FIELD_NAMES) {
    const value = source[field];
    if (typeof value !== 'string' || !value.trim()) continue;

    const normalized = value.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  return '';
};

export default function ReusableListTable<TRecord>({
  data,
  columns,
  rowKey,
  loading = false,
  error,
  emptyMessage,
  eyebrow,
  title,
  copy,
  headerAction,
  actionsLabel = 'Actions',
  renderActions,
  onRowClick,
  className = '',
  wrapperClassName = '',
  tableClassName = '',
  mobileCards = true,
  stickyHeader = false,
  scrollable = false,
  pagination,
}: ReusableListTableProps<TRecord>) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState(10);
  const [internalDateFrom, setInternalDateFrom] = useState('');
  const [internalDateTo, setInternalDateTo] = useState('');
  const hasActions = Boolean(renderActions);
  const columnCount = columns.length + (hasActions ? 1 : 0);
  const showDateFilter = pagination?.showDateFilter === true;
  const showPageSize = pagination?.showPageSize !== false;
  const showToolbar = showDateFilter || showPageSize;
  const dateFrom = showDateFilter ? (pagination?.dateFrom ?? internalDateFrom) : '';
  const dateTo = showDateFilter ? (pagination?.dateTo ?? internalDateTo) : '';
  const usesLocalDateFilter = Boolean(
    (dateFrom || dateTo)
    && !pagination?.onDateFromChange
    && !pagination?.onDateToChange
  );
  const filteredData = useMemo(() => {
    if (!dateFrom && !dateTo) return data;

    return data.filter((record) => {
      const recordDate = readRecordDate(record);
      return Boolean(
        recordDate
        && (!dateFrom || recordDate >= dateFrom)
        && (!dateTo || recordDate <= dateTo)
      );
    });
  }, [data, dateFrom, dateTo]);
  const localTotalPages = Math.max(1, Math.ceil(filteredData.length / internalLimit));
  const effectivePagination = pagination && !usesLocalDateFilter
    ? pagination
    : {
        currentPage: pagination ? 1 : Math.min(internalPage, localTotalPages),
        totalPages: pagination ? 1 : localTotalPages,
        totalRecords: filteredData.length,
        limit: pagination?.limit ?? internalLimit,
        isLoading: pagination?.isLoading ?? loading,
        onPageChange: pagination ? (() => {}) : setInternalPage,
      };
  const displayedData = pagination
    ? filteredData
    : filteredData.slice(
        (effectivePagination.currentPage - 1) * effectivePagination.limit,
        effectivePagination.currentPage * effectivePagination.limit,
      );
  if (process.env.NODE_ENV !== 'production' && title === 'Customers Outstanding') {
    console.log('[Customers Outstanding][ReusableListTable] Final rows array:', displayedData);
  }
  const pageStart = effectivePagination.totalRecords > 0
    ? ((effectivePagination.currentPage - 1) * effectivePagination.limit) + 1
    : 0;
  const pageEnd = Math.min(
    effectivePagination.currentPage * effectivePagination.limit,
    effectivePagination.totalRecords,
  );
  const canGoPrevious = effectivePagination.currentPage > 1 && !effectivePagination.isLoading;
  const canGoNext = effectivePagination.currentPage < effectivePagination.totalPages && !effectivePagination.isLoading;
  const tableClassNames = [
    'table data-table align-middle',
    mobileCards ? 'mobile-card-table' : '',
    stickyHeader ? 'data-table--sticky-header' : '',
    tableClassName,
  ].filter(Boolean).join(' ');

  useEffect(() => {
    setInternalPage(1);
  }, [dateFrom, dateTo, internalLimit]);

  useEffect(() => {
    if (pagination) return;

    const storageKey = `${(title || eyebrow || 'table').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_page_size`;
    const storedLimit = Number(window.localStorage.getItem(storageKey));
    if (PAGE_SIZE_OPTIONS.includes(storedLimit as (typeof PAGE_SIZE_OPTIONS)[number])) {
      setInternalLimit(storedLimit);
    }
  }, [eyebrow, pagination, title]);

  return (
    <section className={`table-panel ${scrollable ? 'table-panel--scrollable' : ''} ${className}`.trim()}>
      <div className="table-panel__header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h3 className="table-panel__title">{title}</h3> : null}
          {copy ? <p className="table-panel__copy">{copy}</p> : null}
        </div>
        <div className="table-panel__header-tools">
          {showToolbar ? <div className="table-toolbar">
            {showDateFilter ? <div className="table-toolbar__date-range">
              <label className="table-toolbar__field">
                <span>From</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (pagination?.onDateFromChange) pagination.onDateFromChange(value);
                    else setInternalDateFrom(value);
                  }}
                />
              </label>
              <label className="table-toolbar__field">
                <span>To</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (pagination?.onDateToChange) pagination.onDateToChange(value);
                    else setInternalDateTo(value);
                  }}
                />
              </label>
              {(dateFrom || dateTo) ? (
                <button
                  type="button"
                  className="table-toolbar__clear"
                  onClick={() => {
                    if (pagination?.onDateFromChange) pagination.onDateFromChange('');
                    else setInternalDateFrom('');
                    if (pagination?.onDateToChange) pagination.onDateToChange('');
                    else setInternalDateTo('');
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div> : null}
            {showPageSize ? (
              <label className="table-toolbar__page-size table-toolbar__page-size--inline">
                <span className="table-toolbar__page-size-label">Show</span>
                <span className="table-toolbar__page-size-control">
                  <select
                    className="form-select form-select-sm"
                    value={pagination?.limit ?? internalLimit}
                    disabled={pagination?.isLoading ?? loading}
                    aria-label="Rows per page"
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (pagination?.onLimitChange) pagination.onLimitChange(value);
                      else {
                        setInternalLimit(value);
                        const storageKey = `${(title || eyebrow || 'table').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_page_size`;
                        window.localStorage.setItem(storageKey, String(value));
                      }
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </span>
                <span className="table-toolbar__page-size-label">rows</span>
              </label>
            ) : null}
          </div> : null}
          {headerAction}
        </div>
      </div>
      <div className={`data-table-wrapper ${wrapperClassName}`.trim()}>
        <table className={tableClassNames}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
              {hasActions ? <th>{actionsLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTable columns={columnCount} rows={5} />
            ) : error ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={columnCount}>{error}</td>
              </tr>
            ) : displayedData.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={columnCount}>{emptyMessage}</td>
              </tr>
            ) : (
              displayedData.map((row, index) => {
                const displayIndex = pagination
                  ? index
                  : ((effectivePagination.currentPage - 1) * effectivePagination.limit) + index;

                return (
                <tr
                  key={rowKey(row)}
                  className={onRowClick ? 'data-table__clickable-row' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.dataLabel || column.header}>
                      {column.render(row, displayIndex)}
                    </td>
                  ))}
                  {hasActions ? (
                    <td data-label={actionsLabel}>
                      {renderActions?.(row)}
                    </td>
                  ) : null}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <div className="table-pagination__summary">
          <span className="table-pagination__range">
            {effectivePagination.totalRecords > 0
              ? `Showing ${pageStart}–${pageEnd} of ${effectivePagination.totalRecords} records`
              : 'No records'}
          </span>
          <span className="table-pagination__page">
            Page {effectivePagination.currentPage} of {Math.max(1, effectivePagination.totalPages)}
          </span>
        </div>
        <div className="table-pagination__actions">
          <button
            type="button"
            className="btn-app btn-app-secondary"
            disabled={!canGoPrevious}
            onClick={() => effectivePagination.onPageChange(effectivePagination.currentPage - 1)}
          >
            <FaChevronLeft />
            Previous
          </button>
          <button
            type="button"
            className="btn-app btn-app-secondary"
            disabled={!canGoNext}
            onClick={() => effectivePagination.onPageChange(effectivePagination.currentPage + 1)}
          >
            Next
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
