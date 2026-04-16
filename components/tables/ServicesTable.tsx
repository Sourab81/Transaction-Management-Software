import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Service } from '../../lib/store';

interface ServicesTableProps {
  services: Service[];
  onEdit?: (service: Service) => void;
  onDelete?: (serviceId: string) => void;
}

const ServicesTable: React.FC<ServicesTableProps> = ({ services, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Services</p>
          <h3 className="table-panel__title">Service catalog</h3>
          <p className="table-panel__copy">Pricing, category, availability, and operator-facing descriptions.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Service</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={7}>No service records found.</td>
              </tr>
            ) : (
              services.map((service, index) => (
                <tr key={service.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Service">
                    <span className="data-table__primary">{service.name}</span>
                  </td>
                  <td data-label="Category">{service.category}</td>
                  <td data-label="Price">Rs. {service.price.toLocaleString('en-IN')}</td>
                  <td data-label="Status">
                    <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                      {service.status}
                    </span>
                  </td>
                  <td data-label="Description">
                    <span className="data-table__secondary">{service.description}</span>
                  </td>
                  <td data-label="Actions">
                    <div className="table-actions">
                      {onEdit && (
                        <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(service)}>
                          <FaEdit size={12} />
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(service.id)}>
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

export default ServicesTable;
