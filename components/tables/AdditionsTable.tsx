import React from 'react';
import { FaCog, FaTrashAlt } from 'react-icons/fa';
import type { AdditionOption } from '../../lib/store';

interface AdditionsTableProps {
  options: AdditionOption[];
  onConfigure?: (option: AdditionOption) => void;
  onDelete?: (optionId: string) => void;
}

const AdditionsTable: React.FC<AdditionsTableProps> = ({ options, onConfigure, onDelete }) => {
  const hasActions = Boolean(onConfigure || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Settings</p>
          <h3 className="table-panel__title">Configuration options</h3>
          <p className="table-panel__copy">Operational rules, integrations, and system-level preferences.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Option</th>
              <th>Category</th>
              <th>Description</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {options.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={7}>No configuration records found.</td>
              </tr>
            ) : (
              options.map((option, index) => (
                <tr key={option.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Option"><span className="data-table__primary">{option.title}</span></td>
                  <td data-label="Category">{option.category}</td>
                  <td data-label="Description"><span className="data-table__secondary">{option.description}</span></td>
                  <td data-label="Status">
                    <span className={`status-chip ${option.status === 'Enabled' ? 'status-chip--enabled' : 'status-chip--disabled'}`}>
                      {option.status}
                    </span>
                  </td>
                  <td data-label="Date">{option.date}</td>
                  <td data-label="Actions">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdditionsTable;
