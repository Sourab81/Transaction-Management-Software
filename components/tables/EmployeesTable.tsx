import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Counter, Employee } from '../../lib/store';
import DataTable from './DataTable';

interface EmployeesTableProps {
  departments: Counter[];
  employees: Employee[];
  onEdit?: (employee: Employee) => void;
  onDelete?: (employeeId: string) => void;
  isLoading?: boolean;
}

const EmployeesTable: React.FC<EmployeesTableProps> = ({
  departments,
  employees,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const hasActions = Boolean(onEdit || onDelete);
  const departmentById = new Map(departments.map((department) => [department.id, department]));

  return (
    <DataTable
      rows={employees}
      getRowKey={(employee) => employee.id}
      eyebrow="Employees"
      title="Employee directory"
      copy="Staff contact details and status in a clean list the business owner can manage."
      emptyLabel="No employee records found."
      isLoading={isLoading}
      columns={[
        { key: 'serial', header: 'S.No', render: (_employee, index) => index + 1 },
        { key: 'employee', header: 'Employee', render: (employee) => <span className="data-table__primary">{employee.name}</span> },
        {
          key: 'department',
          header: 'Department',
          render: (employee) => {
            const department = employee.departmentId ? departmentById.get(employee.departmentId) : undefined;
            return department ? `${department.name} (${department.code})` : 'Not assigned';
          },
        },
        {
          key: 'permissions',
          header: 'Permissions',
          render: (employee) => `${Object.values(employee.permissions || {}).filter((enabled) => enabled === 1).length} enabled`,
        },
        { key: 'phone', header: 'Phone', render: (employee) => employee.phone },
        { key: 'email', header: 'Email', render: (employee) => employee.email || 'Not added' },
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
        { key: 'joined', header: 'Joined', render: (employee) => employee.joinedDate || 'Not added' },
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
