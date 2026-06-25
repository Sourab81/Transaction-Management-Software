import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Employee } from '../../lib/store';
import { formatDateTime } from '../../src/utils/dateFormatter';
import DataTable from './DataTable';
import type { DataTablePagination } from './DataTable';

interface EmployeesTableProps {
  employees: Employee[];
  onEdit?: (employee: Employee) => void;
  onDelete?: (employeeId: string) => void;
  isLoading?: boolean;
  pagination?: DataTablePagination;
}

const EmployeesTable: React.FC<EmployeesTableProps> = ({
  employees,
  onEdit,
  onDelete,
  isLoading = false,
  pagination,
}) => {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <DataTable
      rows={employees}
      getRowKey={(employee) => employee.id}
      eyebrow="Employees"
      title="Employee directory"
      copy="Staff contact details and status in a clean list the business owner can manage."
      emptyLabel="No employee records found."
      isLoading={isLoading}
      pagination={pagination}
      columns={[
        { key: 'displayName', header: 'Display Name', render: (employee) => <span className="data-table__primary">{employee.displayName || employee.nickName || employee.name}</span> },
        { key: 'fullName', header: 'Full Name', render: (employee) => employee.fullName || employee.name },
        { key: 'mobile', header: 'Mobile', render: (employee) => employee.mobile || employee.phone },
        { key: 'email', header: 'Email', render: (employee) => employee.email || 'Not added' },
        { key: 'gender', header: 'Gender', render: (employee) => employee.gender || '-' },
        {
          key: 'status',
          header: 'Status',
          render: (employee) => {
            const status = employee.status || 'Active';
            return (
              <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                {status}
              </span>
            );
          },
        },
        { key: 'addedDate', header: 'Added Date', render: (employee) => formatDateTime(employee.addedDate || employee.createDate || employee.joinedDate, 'Not added') },
      ]}
      renderActions={(employee) => (
        <div className="table-actions">
          {onEdit ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEdit(employee)}>
              <FaEdit size={12} />
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(employee.id)}>
              <FaTrashAlt size={12} />
              Delete
            </button>
          ) : null}
          {!hasActions ? <span className="page-muted small">View only</span> : null}
        </div>
      )}
    />
  );
};

export default EmployeesTable;
