import React from 'react';
import { FaEdit, FaEye, FaTrashAlt } from 'react-icons/fa';
import type { Business, BusinessCustomer } from '../../lib/store';
import type { RoleTemplate } from '../../lib/types/role-template';
import DataTable, {
  type DataTableColumn,
  type DataTablePagination,
} from './DataTable';

type CustomerDirectoryRecord = Business | BusinessCustomer;
type UserRoleDisplayRecord = Partial<Pick<
  Business,
  'role' | 'role_id' | 'roleTemplateId' | 'role_template_id' | 'role_name' | 'roleName' | 'selectedRoleName'
>>;

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
  showRoleColumn?: boolean;
  roleTemplates?: RoleTemplate[];
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
  showRoleColumn = false,
  roleTemplates = [],
}) => {
  const hasActions = Boolean(onView || onEdit || onDelete);
  const getUserRoleTemplateId = (customer: CustomerDirectoryRecord) => {
    const user = customer as UserRoleDisplayRecord;

    return user.roleTemplateId?.trim()
      || user.role_template_id?.trim()
      || user.role_id?.trim()
      || user.role?.trim()
      || '';
  };
  const getUserRoleDisplayName = (customer: CustomerDirectoryRecord) => {
    const user = customer as UserRoleDisplayRecord;
    const directRoleName = user.role_name?.trim()
      || user.roleName?.trim()
      || user.selectedRoleName?.trim();

    if (directRoleName) {
      return directRoleName;
    }

    const roleTemplateId = getUserRoleTemplateId(customer);
    return roleTemplateId
      ? roleTemplates.find((roleTemplate) => roleTemplate.id === roleTemplateId)?.roleName || '-'
      : '-';
  };
  const columns: Array<DataTableColumn<CustomerDirectoryRecord>> = [
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
    ...(showRoleColumn
      ? [{
          key: 'role',
          header: 'Role',
          render: getUserRoleDisplayName,
        }]
      : []),
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
  ];

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
      columns={columns}
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
