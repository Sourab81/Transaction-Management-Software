import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Service } from '../../lib/store';
import DataTable from './DataTable';

interface ServicesTableProps {
  services: Service[];
  onEdit?: (service: Service) => void;
  onDelete?: (serviceId: string) => void;
}

const ServicesTable: React.FC<ServicesTableProps> = ({ services, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={services}
      getRowKey={(service) => service.id}
      eyebrow="Services"
      title="Service catalog"
      copy="Pricing, category, availability, and operator-facing descriptions."
      emptyLabel="No service records found."
      columns={[
        { key: 'serial', header: 'S.No', render: (_service, index) => index + 1 },
        { key: 'service', header: 'Service', render: (service) => <span className="data-table__primary">{service.name}</span> },
        { key: 'category', header: 'Category', render: (service) => service.category },
        { key: 'price', header: 'Price', render: (service) => `Rs. ${service.price.toLocaleString('en-IN')}` },
        {
          key: 'status',
          header: 'Status',
          render: (service) => (
            <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {service.status}
            </span>
          ),
        },
        { key: 'description', header: 'Description', render: (service) => <span className="data-table__secondary">{service.description}</span> },
      ]}
      renderActions={(service) => (
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
      )}
    />
  );
};

export default ServicesTable;
