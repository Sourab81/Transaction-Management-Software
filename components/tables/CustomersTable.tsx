import React from 'react';
import { FaEdit, FaEye, FaTrashAlt } from 'react-icons/fa';
import type { Business, BusinessCustomer } from '../../lib/store';
import DataTable, {
  type DataTablePagination,
} from './DataTable';

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
  isLoading?: boolean;
  pagination?: DataTablePagination;
  headerAction?: React.ReactNode;
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
  isLoading = false,
  pagination,
  headerAction,
}) => {
  const hasActions = Boolean(onView || onEdit || onDelete);

  return (
    <DataTable
      rows={customers}
      getRowKey={(customer) => customer.id}
      eyebrow={eyebrow}
      title={title}
      copy={copy}
      emptyLabel={emptyLabel}
      headerAction={headerAction}
      isLoading={isLoading}
      pagination={pagination}
      columns={[
        {
          key: 'serial',
          header: 'S.No',
          render: (_customer, index) =>
            (pagination ? ((pagination.currentPage - 1) * pagination.limit) : 0) + index + 1,
        },
        {
          key: 'name',
          header: entityLabel,
          render: (customer) => <span className="data-table__primary">{customer.name}</span>,
        },
        {
          key: 'phone',
          header: 'Phone',
          render: (customer) => customer.phone,
        },
        {
          key: 'email',
          header: 'Email',
          render: (customer) => customer.email || 'Not added',
        },
        {
          key: 'status',
          header: 'Status',
          render: (customer) => {
            const status = customer.status || 'Active';

            return (
              <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                {status}
              </span>
            );
          },
        },
        {
          key: 'joined',
          header: 'Joined',
          render: (customer) => customer.joinedDate || 'Not added',
        },
      ]}
      renderActions={(customer) => (
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
      )}
    />
  );
};

export default CustomersTable;
