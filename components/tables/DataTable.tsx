import React from 'react';
import ReusableListTable, {
  type ReusableListTableColumn,
  type ReusableListTablePagination,
} from '../common/ReusableListTable';

export type DataTableColumn<TRecord> = ReusableListTableColumn<TRecord>;
export type DataTablePagination = ReusableListTablePagination;

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
  return (
    <ReusableListTable
      data={rows}
      columns={columns}
      rowKey={getRowKey}
      eyebrow={eyebrow}
      title={title}
      copy={copy}
      emptyMessage={emptyLabel}
      headerAction={headerAction}
      loading={isLoading}
      pagination={pagination}
      renderActions={renderActions}
    />
  );
}
