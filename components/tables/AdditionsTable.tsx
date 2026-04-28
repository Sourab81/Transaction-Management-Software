import React from 'react';
import { FaCog, FaTrashAlt } from 'react-icons/fa';
import type { AdditionOption } from '../../lib/store';
import DataTable from './DataTable';

interface AdditionsTableProps {
  options: AdditionOption[];
  onConfigure?: (option: AdditionOption) => void;
  onDelete?: (optionId: string) => void;
}

const AdditionsTable: React.FC<AdditionsTableProps> = ({ options, onConfigure, onDelete }) => {
  const hasActions = Boolean(onConfigure || onDelete);

  return (
    <DataTable
      rows={options}
      getRowKey={(option) => option.id}
      eyebrow="Settings"
      title="Configuration options"
      copy="Operational rules, integrations, and system-level preferences."
      emptyLabel="No configuration records found."
      columns={[
        { key: 'serial', header: 'S.No', render: (_option, index) => index + 1 },
        { key: 'option', header: 'Option', render: (option) => <span className="data-table__primary">{option.title}</span> },
        { key: 'category', header: 'Category', render: (option) => option.category },
        { key: 'description', header: 'Description', render: (option) => <span className="data-table__secondary">{option.description}</span> },
        {
          key: 'status',
          header: 'Status',
          render: (option) => (
            <span className={`status-chip ${option.status === 'Enabled' ? 'status-chip--enabled' : 'status-chip--disabled'}`}>
              {option.status}
            </span>
          ),
        },
        { key: 'date', header: 'Date', render: (option) => option.date },
      ]}
      renderActions={(option) => (
        <div className="table-actions">
          {onConfigure && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onConfigure(option)}>
              <FaCog size={12} />
              Configure
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(option.id)}>
              <FaTrashAlt size={12} />
              Delete
            </button>
          )}
          {!hasActions && <span className="page-muted small">View only</span>}
        </div>
      )}
    />
  );
};

export default AdditionsTable;
