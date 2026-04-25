import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export interface DataTableColumn<TRecord> {
  key: string;
  header: string;
  dataLabel?: string;
  render: (record: TRecord, index: number) => React.ReactNode;
}

export interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  isLoading?: boolean;
  // Server-backed list screens provide this callback so the table can request
  // the next page without keeping endpoint-specific API logic inside the UI.
  onPageChange: (page: number) => void;
}

interface DataTableProps<TRecord> {
  rows: TRecord[];
  columns: Array<DataTableColumn<TRecord>>;
  getRowKey: (record: TRecord) => string;
  eyebrow?: string;
  title?: string;
  copy?: string;
  emptyLabel: string;
  headerAction?: React.ReactNode;
  isLoading?: boolean;
  pagination?: DataTablePagination;
  renderActions?: (record: TRecord) => React.ReactNode;
}

export default function DataTable<TRecord>({
  rows,
  columns,
  getRowKey,
  eyebrow,
  title,
  copy,
  emptyLabel,
  headerAction,
  isLoading = false,
  pagination,
  renderActions,
}: DataTableProps<TRecord>) {
  const hasActions = Boolean(renderActions);
  const columnCount = columns.length + (hasActions ? 1 : 0);
  const pageStart = pagination && pagination.totalRecords > 0
    ? ((pagination.currentPage - 1) * pagination.limit) + 1
    : 0;
  const pageEnd = pagination
    ? Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)
    : rows.length;
  const canGoPrevious = Boolean(pagination && pagination.currentPage > 1 && !pagination.isLoading);
  const canGoNext = Boolean(pagination && pagination.currentPage < pagination.totalPages && !pagination.isLoading);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h3 className="table-panel__title">{title}</h3> : null}
          {copy ? <p className="table-panel__copy">{copy}</p> : null}
        </div>
        {headerAction}
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
              {hasActions ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={columnCount}>Loading records...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={columnCount}>{emptyLabel}</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={getRowKey(row)}>
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.dataLabel || column.header}>
                      {column.render(row, index)}
                    </td>
                  ))}
                  {hasActions ? (
                    <td data-label="Actions">
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
