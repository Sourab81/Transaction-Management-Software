import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Service } from '../../lib/store';
import DataTable from './DataTable';

interface ServicesTableProps {
  services: Service[];
  onEdit?: (service: Service) => void;
  onDelete?: (serviceId: string) => void;
}

const RemarkCell: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = React.useState(false);
  if (!text || text === 'No remark') return <span className="page-muted">—</span>;

  const isLong = text.length > 40;

  return (
    <span>
      <span className="data-table__secondary">
        {expanded || !isLong ? text : `${text.slice(0, 40)}…`}
      </span>
      {isLong ? (
        <button
          type="button"
          className="btn-inline-link ms-1"
          onClick={() => setExpanded((value) => !value)}
          style={{ fontSize: 11, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? 'less' : 'more'}
        </button>
      ) : null}
    </span>
  );
};

const ServicesTable: React.FC<ServicesTableProps> = ({ services, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={services}
      getRowKey={(service) => service.id}
      eyebrow="Inventory"
      title="Inventory catalog"
      emptyLabel="No inventory records found."
      columns={[
        { key: 'serial', header: 'S.No', render: (_service, index) => index + 1 },
        {
          key: 'name',
          header: 'Inventory Name',
          render: (service) => <span className="data-table__primary">{service.name}</span>,
        },
        {
          key: 'type',
          header: 'Inventory Type',
          render: (service) => (
            <span className={`status-chip ${service.type === 'product' ? 'status-chip--info' : 'status-chip--active'}`}>
              {service.type === 'product' ? 'Product' : 'Service'}
            </span>
          ),
        },
        {
          key: 'quantity',
          header: 'Current Quantity',
          render: (service) => service.type === 'product'
            ? <span className="data-table__primary">{service.currentStock ?? service.quantity ?? 0}</span>
            : <span className="page-muted">—</span>,
        },
        {
          key: 'status',
          header: 'Status',
          render: (service) => (
            <span className={`status-chip ${service.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
              {service.status}
            </span>
          ),
        },
        {
          key: 'remark',
          header: 'Remark',
          render: (service) => <RemarkCell text={service.remark || service.description || ''} />,
        },
        {
          key: 'addedBy',
          header: 'Added By',
          render: (service) => service.addedByName || '-',
        },
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
