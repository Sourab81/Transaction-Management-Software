import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
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
  const hasActions = Boolean(renderActions);
  const columnCount = columns.length + (hasActions ? 1 : 0);
  const pageStart = pagination && pagination.totalRecords > 0
    ? ((pagination.currentPage - 1) * pagination.limit) + 1
    : 0;
  const pageEnd = pagination
    ? Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)
    : data.length;
  const canGoPrevious = Boolean(pagination && pagination.currentPage > 1 && !pagination.isLoading);
  const canGoNext = Boolean(pagination && pagination.currentPage < pagination.totalPages && !pagination.isLoading);
  const tableClassNames = [
    'table data-table align-middle',
    mobileCards ? 'mobile-card-table' : '',
    stickyHeader ? 'data-table--sticky-header' : '',
    tableClassName,
  ].filter(Boolean).join(' ');

  return (
    <section className={`table-panel ${scrollable ? 'table-panel--scrollable' : ''} ${className}`.trim()}>
      <div className="table-panel__header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h3 className="table-panel__title">{title}</h3> : null}
          {copy ? <p className="table-panel__copy">{copy}</p> : null}
        </div>
        {headerAction}
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
            ) : data.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={columnCount}>{emptyMessage}</td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={onRowClick ? 'data-table__clickable-row' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.dataLabel || column.header}>
                      {column.render(row, index)}
                    </td>
                  ))}
                  {hasActions ? (
                    <td data-label={actionsLabel}>
                      {renderActions?.(row)}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination ? (
        <div className="table-pagination">
          <span className="page-muted">
            Showing {pageStart}-{pageEnd} of {pagination.totalRecords}
          </span>
          <div className="table-pagination__actions">
            <button
              type="button"
              className="btn-app btn-app-secondary"
              disabled={!canGoPrevious}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              <FaChevronLeft />
              Previous
            </button>
            <span className="status-chip status-chip--info">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn-app btn-app-secondary"
              disabled={!canGoNext}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next
              <FaChevronRight />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
