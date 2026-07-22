import React from 'react';
import { FaEdit } from 'react-icons/fa';
import type { Business, BusinessCustomer } from '../../lib/store';
import type { RoleTemplate } from '../../lib/types/role-template';
import { formatDateTime } from '../../src/utils/dateFormatter';
import DataTable, {
  type DataTableColumn,
  type DataTablePagination,
} from './DataTable';
import RemarkCell from '../common/RemarkCell';
import CustomerName from '../common/CustomerName';

type CustomerDirectoryRecord = Business | BusinessCustomer;
type UserRoleDisplayRecord = Partial<Pick<
  Business,
  'role' | 'role_id' | 'roleTemplateId' | 'role_template_id' | 'role_name' | 'roleName' | 'selectedRoleName'
>>;

interface CustomersTableProps {
  customers: CustomerDirectoryRecord[];
  onEdit?: (recordId: string) => void;
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
  onEdit,
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
  const hasActions = Boolean(onEdit);
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
  const getCustomerName = (customer: CustomerDirectoryRecord) =>
    'customerName' in customer && customer.customerName ? customer.customerName : customer.name;
  const getCustomerMobile = (customer: CustomerDirectoryRecord) =>
    'mobileNo' in customer && customer.mobileNo ? customer.mobileNo : customer.phone;
  const getCustomerCode = (customer: CustomerDirectoryRecord) =>
    'customerCode' in customer && customer.customerCode ? customer.customerCode : '-';
  const isCustomerDirectory = entityLabel === 'Customer';

  const columns: Array<DataTableColumn<CustomerDirectoryRecord>> = [
    {
      key: 'serial',
      header: 'S.No',
      render: (_customer, index) =>
        (pagination ? ((pagination.currentPage - 1) * pagination.limit) : 0) + index + 1,
    },
    ...(isCustomerDirectory
      ? [{
          key: 'customerCode',
          header: 'Customer Code',
          render: getCustomerCode,
        }]
      : []),
    {
      key: 'name',
      header: entityLabel === 'Customer' ? 'Customer Name' : entityLabel,
      render: (customer) => {
        const color = 'color' in customer ? (customer as BusinessCustomer).color : undefined;
        return (
          <CustomerName name={getCustomerName(customer)} color={color} />
        );
      },
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
      header: 'Mobile',
      render: getCustomerMobile,
    },
    {
      key: 'email',
      header: 'Email',
      render: (customer) => customer.email || 'Not added',
    },
    {
      key: 'address',
      header: 'Address',
      render: (customer) => 'address' in customer ? customer.address || 'Not added' : 'Not added',
    },

    {
  key: 'remark',
  header: 'Remark',
  render: (customer) =>
    'remark' in customer
      ? customer.remark || 'Not added'
      : 'Not added',
    },

{
          key: 'joined',
          header: 'Added Date',
          render: (customer: CustomerDirectoryRecord) => formatDateTime(
            'addedDate' in customer ? customer.addedDate || customer.joinedDate : customer.joinedDate,
            'Not added',
          ),
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
          {onEdit && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(customer.id)}>
              <FaEdit size={12} />
              Edit
            </button>
          )}
          {!hasActions && <span className="page-muted small">View only</span>}
        </div>
      )}
    />
  );
};

export default CustomersTable;
