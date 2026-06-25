import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Service } from '../../lib/store';
import { formatDateTime } from '../../src/utils/dateFormatter';
import DataTable from './DataTable';

interface ServicesTableProps {
  services: Service[];
  onEdit?: (service: Service) => void;
  onDelete?: (serviceId: string) => void;
}

const getCurrentStock = (service: Service) => service.currentStock ?? service.quantity ?? 0;
const getLowStockThreshold = (service: Service) => service.lowStockThreshold ?? 0;
const getStockStatus = (service: Service) => {
  if (service.type !== 'product') return 'In Stock';

  const currentStock = getCurrentStock(service);
  if (currentStock <= 0) return 'Out Of Stock';
  if (getLowStockThreshold(service) > 0 && currentStock <= getLowStockThreshold(service)) return 'Low Stock';
  return 'In Stock';
};
const getStockStatusClassName = (status: string) => {
  if (status === 'Out Of Stock') return 'stock-status-badge stock-status-badge--out';
  if (status === 'Low Stock') return 'stock-status-badge stock-status-badge--low';
  return 'stock-status-badge stock-status-badge--in';
};

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
        { key: 'openingStock', header: 'Opening Stock', render: (service) => service.openingStock ?? service.quantity ?? 0 },
        { key: 'currentStock', header: 'Current Stock', render: (service) => getCurrentStock(service) },
        {
          key: 'stockStatus',
          header: 'Stock Status',
          render: (service) => {
            const stockStatus = getStockStatus(service);
            return <span className={getStockStatusClassName(stockStatus)}>{stockStatus}</span>;
          },
        },
        { key: 'remark', header: 'Remark', render: (service) => <span className="data-table__secondary">{service.remark || service.description || 'No remark'}</span> },
        { key: 'addedBy', header: 'Added By', render: (service) => service.addedByName || '-' },
        {
          key: 'status',
          header: 'Status',
          render: (service) => (
            <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {service.status}
            </span>
          ),
        },
        { key: 'addedDate', header: 'Added Date', render: (service) => formatDateTime(service.addedDate, 'Not added') },
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
