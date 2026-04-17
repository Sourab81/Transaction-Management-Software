'use client';

import SectionHero from '../SectionHero';
import DepartmentsTable from '../../tables/DepartmentsTable';
import { FaPlusCircle } from 'react-icons/fa';

interface DepartmentsTabProps {
  ctx: any;
}

export default function DepartmentsTab({ ctx }: DepartmentsTabProps) {
  const {
    renderSummaryCards,
    departmentSummary,
    canAddDepartmentRecords,
    canEditDepartmentRecords,
    canDeleteDepartmentRecords,
    counters,
    accounts,
    filteredDepartments,
    departmentSearchInput,
    departmentAccountStatusFilter,
    handleDepartmentSearch,
    setDepartmentSearchInput,
    setDepartmentAccountStatusFilter,
    clearDepartmentFilters,
    handleQuickAction,
    handleEditDepartment,
    handleDeleteRecord,
  } = ctx;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Department Hub"
          title="Manage departments and linked counters"
          description="Add departments, map them to accounts, and review balances with search and account-status filters."
          action={canAddDepartmentRecords ? {
            label: 'Add Department',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-department'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(departmentSummary)}

      <div className="col-12">
        <section className="panel department-toolbar">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Search and Filter</p>
              <h2 className="panel-title">Find the right department quickly</h2>
              <p className="panel-copy">Search by department, code, account holder, bank, or account number, then filter by linked account status.</p>
            </div>
            <div className="panel-status-chip">
              Showing {filteredDepartments.length} of {counters.length}
            </div>
          </div>

          <form
            className="department-toolbar__grid"
            onSubmit={(event) => {
              event.preventDefault();
              handleDepartmentSearch();
            }}
          >
            <div className="app-field mb-0">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search departments, account holder, bank, or account number"
                value={departmentSearchInput}
                onChange={(event) => setDepartmentSearchInput(event.target.value)}
              />
            </div>
            <div className="app-field mb-0">
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={departmentAccountStatusFilter}
                onChange={(event) => setDepartmentAccountStatusFilter(event.target.value as 'All' | 'Active' | 'Inactive' | 'Unassigned')}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>
            <div className="department-toolbar__actions">
              <button type="submit" className="btn-app btn-app-primary">Search</button>
              <button type="button" className="btn-app btn-app-secondary" onClick={clearDepartmentFilters}>Clear</button>
            </div>
          </form>
        </section>
      </div>

      <div className="col-12">
        <DepartmentsTable
          accounts={accounts}
          counters={filteredDepartments.map((row: any) => row.counter)}
          onEdit={canEditDepartmentRecords ? handleEditDepartment : undefined}
          onDelete={canDeleteDepartmentRecords ? (id: string) => handleDeleteRecord('DELETE_COUNTER', id) : undefined}
        />
      </div>
    </div>
  );
}
