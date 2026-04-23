import React from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import type { Counter, Employee } from '../../lib/store';

interface EmployeesTableProps {
  departments: Counter[];
  employees: Employee[];
  onEdit?: (employee: Employee) => void;
  onDelete?: (employeeId: string) => void;
}

const EmployeesTable: React.FC<EmployeesTableProps> = ({ departments, employees, onEdit, onDelete }) => {
  const hasActions = Boolean(onEdit || onDelete);
  const departmentById = new Map(departments.map((department) => [department.id, department]));

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Employees</p>
          <h3 className="table-panel__title">Employee directory</h3>
          <p className="table-panel__copy">Staff contact details and status in a clean list the business owner can manage.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Permissions</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={9}>No employee records found.</td>
              </tr>
            ) : (
              employees.map((employee, index) => {
                const status = employee.status || 'Active';
                const department = employee.departmentId ? departmentById.get(employee.departmentId) : undefined;
                const enabledPermissionCount = Object.values(employee.permissions || {}).filter((enabled) => enabled === 1).length;

                return (
                  <tr key={employee.id}>
                    <td data-label="S.No">{index + 1}</td>
                    <td data-label="Employee"><span className="data-table__primary">{employee.name}</span></td>
                    <td data-label="Department">{department ? `${department.name} (${department.code})` : 'Not assigned'}</td>
                    <td data-label="Permissions">{enabledPermissionCount} enabled</td>
                    <td data-label="Phone">{employee.phone}</td>
                    <td data-label="Email">{employee.email || 'Not added'}</td>
                    <td data-label="Status">
                      <span className={`status-chip ${status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                        {status}
                      </span>
                    </td>
                    <td data-label="Joined">{employee.joinedDate || 'Not added'}</td>
                    <td data-label="Actions">
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EmployeesTable;
