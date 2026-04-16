import React from 'react';
import { FaEdit, FaEye, FaTrashAlt } from 'react-icons/fa';
import type { Business, BusinessCustomer } from '../../lib/store';

type CustomerDirectoryRecord = Business | BusinessCustomer;

interface CustomersTableProps {
  customers: CustomerDirectoryRecord[];
  onView?: (recordId: string) => void;
  onEdit?: (recordId: string) => void;
  onDelete?: (recordId: string) => void;
  eyebrow?: string;
  title?: string;
  copy?: string;
  entityLabel?: string;
  emptyLabel?: string;
}

const CustomersTable: React.FC<CustomersTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
  eyebrow = 'Customers',
  title = 'Customer directory',
  copy = 'Contact details and profile status used across service workflows.',
  entityLabel = 'Customer',
  emptyLabel = 'No customer records found.',
}) => {
  const hasActions = Boolean(onView || onEdit || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3 className="table-panel__title">{title}</h3>
          <p className="table-panel__copy">{copy}</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>{entityLabel}</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={7}>{emptyLabel}</td>
              </tr>
            ) : (
              customers.map((customer, index) => {
                const status = customer.status || 'Active';

                return (
                  <tr key={customer.id}>
                    <td data-label="S.No">{index + 1}</td>
                    <td data-label={entityLabel}>
                      <span className="data-table__primary">{customer.name}</span>
                    </td>
                    <td data-label="Phone">{customer.phone}</td>
                    <td data-label="Email">{customer.email || 'Not added'}</td>
                    <td data-label="Status">
                      <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                        {status}
                      </span>
                    </td>
                    <td data-label="Joined">{customer.joinedDate || 'Not added'}</td>
                    <td data-label="Actions">
                      <div className="table-actions">
                        {onView && (
                          <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onView(customer.id)}>
                            <FaEye size={12} />
                            View
                          </button>
                        )}
                        {onEdit && (
                          <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(customer.id)}>
                            <FaEdit size={12} />
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(customer.id)}>
                            <FaTrashAlt size={12} />
                            Delete
                          </button>
                        )}
                        {!hasActions && <span className="page-muted small">View only</span>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CustomersTable;
