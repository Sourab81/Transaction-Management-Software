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
      eyebrow="Inventory"
      title="Inventory catalog"
      copy="Inventory items with quantity, department, and availability."
      emptyLabel="No inventory records found."
      columns={[
        { key: 'serial', header: 'S.No', render: (_service, index) => index + 1 },
        { key: 'name', header: 'Name', render: (service) => <span className="data-table__primary">{service.name}</span> },
        { key: 'type', header: 'Type', render: (service) => service.type === 'product' ? 'Product' : 'Service' },
        { key: 'quantity', header: 'Quantity', render: (service) => service.quantity ?? 0 },
        { key: 'remark', header: 'Remark', render: (service) => <span className="data-table__secondary">{service.remark || service.description || 'No remark'}</span> },
        { key: 'counter', header: 'Counter/Department', render: (service) => service.departmentName || 'General' },
        {
          key: 'status',
          header: 'Status',
          render: (service) => (
            <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {service.status}
            </span>
          ),
        },
        { key: 'addedDate', header: 'Added Date', render: (service) => service.addedDate || 'Not added' },
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
