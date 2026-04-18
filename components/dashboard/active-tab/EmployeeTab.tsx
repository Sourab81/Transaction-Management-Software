'use client';

import SectionHero from '../SectionHero';
import EmployeesTable from '../../tables/EmployeesTable';
import { FaPlusCircle } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import PermissionState from '../../ui/state/PermissionState';
import type { DashboardTabContext } from './types';

interface EmployeeTabProps {
  ctx: DashboardTabContext;
}

export default function EmployeeTab({ ctx }: EmployeeTabProps) {
  const {
    renderSummaryCards,
    employeeSummary,
    canAddEmployeeRecords,
    canViewEmployeeRecords,
    employees,
    counters,
    canEditEmployeeRecords,
    canDeleteEmployeeRecords,
    handleQuickAction,
    handleEditEmployee,
    handleDeleteRecord,
  } = ctx;
  const employeeUi = getModuleUi('employee');
  const addEmployeeAction = canAddEmployeeRecords
    ? {
        label: 'Add Employee',
        onClick: () => handleQuickAction('add-employee'),
      }
    : undefined;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Employee Hub"
          title="Manage your employee directory"
          description="Add, update, and remove employee records from the business workspace."
          action={canAddEmployeeRecords ? {
            label: 'Add Employee',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-employee'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(employeeSummary)}

      <div className="col-12">
        {canViewEmployeeRecords ? (
          employees.length === 0 ? (
            <EmptyState
              eyebrow={employeeUi?.label}
              title={employeeUi?.emptyTitle || 'No employees added yet'}
              description={employeeUi?.emptyDescription || 'Add team members to assign permissions and departments.'}
              action={addEmployeeAction}
            />
          ) : (
            <EmployeesTable
              departments={counters}
              employees={employees}
              onEdit={canEditEmployeeRecords ? handleEditEmployee : undefined}
              onDelete={canDeleteEmployeeRecords ? (id: string) => handleDeleteRecord('DELETE_EMPLOYEE', id) : undefined}
            />
          )
        ) : (
          <PermissionState
            eyebrow={employeeUi?.label}
            title={employeeUi?.permissionTitle || 'Employee access is restricted'}
            description="Add Employee can stay enabled on its own, but the directory list only appears when an employee list, salary, or outstanding permission is available."
            action={addEmployeeAction}
          />
        )}
      </div>
    </div>
  );
}
