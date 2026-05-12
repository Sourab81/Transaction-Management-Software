import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Counter } from '../../lib/store';
import DataTable from './DataTable';

interface DepartmentsTableProps {
  counters: Counter[];
  onEdit?: (counter: Counter) => void;
  onDelete?: (counterId: string) => void;
  isLoading?: boolean;
}

const DepartmentsTable: React.FC<DepartmentsTableProps> = ({
  counters,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={counters}
      getRowKey={(counter) => counter.id}
      eyebrow="Departments"
      title="Department records"
      copy="Review department identifiers, names, remarks, status, and creation dates."
      emptyLabel="No department records found."
      isLoading={isLoading}
      columns={[
        { key: 'serial', header: 'S.No', render: (_counter, index) => index + 1 },
        { key: 'code', header: 'Department Code / ID', render: (counter) => counter.code || counter.id },
        {
          key: 'department',
          header: 'Department Name',
          render: (counter) => <span className="data-table__primary">{counter.name}</span>,
        },
        { key: 'remark', header: 'Remark', render: (counter) => counter.remark || '-' },
        {
          key: 'departmentStatus',
          header: 'Status',
          render: (counter) => (
            <span className={`status-chip ${counter.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {counter.status}
            </span>
          ),
        },
        { key: 'date', header: 'Created Date', render: (counter) => counter.date || '-' },
      ]}
      renderActions={(counter) => (
        <div className="table-actions">
          {onEdit ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(counter)}>
              <FaEdit size={12} />
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(counter.id)}>
              <FaTrashAlt size={12} />
              Delete
            </button>
          ) : null}
          {!hasActions ? <span className="page-muted small">View only</span> : null}
        </div>
      )}
    />
  );
};

export default DepartmentsTable;
