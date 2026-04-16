import React from 'react';
import { FaCog, FaEdit, FaFilter } from 'react-icons/fa';

export interface SubscriptionTransactionRow {
  businessId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  planLabel: string;
  planStatusLabel: string;
  planStatusClass: string;
  workspaceStatusLabel: string;
  workspaceStatusClass: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
}

interface SubscriptionTransactionsTableProps {
  rows: SubscriptionTransactionRow[];
  onManagePlan?: (businessId: string) => void;
  onEditBusiness?: (businessId: string) => void;
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
}

const SubscriptionTransactionsTable: React.FC<SubscriptionTransactionsTableProps> = ({
  rows,
  onManagePlan,
  onEditBusiness,
  onToggleFilters,
  isFilterOpen = false,
}) => {
  const hasActions = Boolean(onManagePlan || onEditBusiness);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Transactions</p>
          <h3 className="table-panel__title">Plan purchases</h3>
          <p className="table-panel__copy">Track subscription purchases, renewals, and workspace access by business.</p>
        </div>
        {onToggleFilters ? (
          <button
            type="button"
            className="btn-app btn-app-secondary"
            onClick={onToggleFilters}
            aria-expanded={isFilterOpen}
            aria-controls="admin-plan-filter-panel"
          >
            <FaFilter />
            {isFilterOpen ? 'Hide Filters' : 'Filter'}
          </button>
        ) : null}
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Business</th>
              <th>Plan Purchased</th>
              <th>Plan Status</th>
              <th>Workspace</th>
              <th>Start</th>
              <th>End</th>
              <th>Remaining</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={9}>No subscription transactions found.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.businessId}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Business">
                    <span className="data-table__primary">{row.businessName}</span>
                    <span className="data-table__secondary d-block">{row.businessPhone} | {row.businessEmail}</span>
                  </td>
                  <td data-label="Plan Purchased">{row.planLabel}</td>
                  <td data-label="Plan Status">
                    <span className={row.planStatusClass}>{row.planStatusLabel}</span>
                  </td>
                  <td data-label="Workspace">
                    <span className={row.workspaceStatusClass}>{row.workspaceStatusLabel}</span>
                  </td>
                  <td data-label="Start">{row.startDate}</td>
                  <td data-label="End">{row.endDate}</td>
                  <td data-label="Remaining">{row.daysRemaining} day{row.daysRemaining === 1 ? '' : 's'}</td>
                  <td data-label="Actions">
                    <div className="table-actions">
                      {onManagePlan ? (
                        <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onManagePlan(row.businessId)}>
                          <FaCog size={12} />
                          Manage Plan
                        </button>
                      ) : null}
                      {onEditBusiness ? (
                        <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onEditBusiness(row.businessId)}>
                          <FaEdit size={12} />
                          Edit
                        </button>
                      ) : null}
                      {!hasActions ? <span className="page-muted small">View only</span> : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SubscriptionTransactionsTable;
