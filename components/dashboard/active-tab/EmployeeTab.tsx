'use client';

import SectionHero from '../SectionHero';
import EmployeesTable from '../../tables/EmployeesTable';
import { FaPlusCircle } from 'react-icons/fa';

interface EmployeeTabProps {
  ctx: any;
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
          <EmployeesTable
            departments={counters}
            employees={employees}
            onEdit={canEditEmployeeRecords ? handleEditEmployee : undefined}
            onDelete={canDeleteEmployeeRecords ? (id: string) => handleDeleteRecord('DELETE_EMPLOYEE', id) : undefined}
          />
        ) : (
          <section className="panel p-4">
            <p className="eyebrow mb-2">Employee Directory</p>
            <h3 className="h5 fw-semibold mb-2">Employee list access is disabled</h3>
            <p className="page-muted mb-0">
              Add Employee can stay enabled on its own, but the directory list only appears when an employee list, salary, or outstanding permission is available.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
