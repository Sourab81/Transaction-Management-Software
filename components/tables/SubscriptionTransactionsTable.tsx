import React from 'react';
import { FaCog, FaEdit, FaFilter } from 'react-icons/fa';
import DataTable from './DataTable';

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
    <DataTable
      rows={rows}
      getRowKey={(row) => row.businessId}
      eyebrow="SUBSCRIPTIONS"
      title="Manage subscriptions and workspace access."
      copy="Track purchases, renewals, and access by business"
      emptyLabel="No subscription transactions found."
      headerAction={onToggleFilters ? (
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
      columns={[
        { key: 'serial', header: 'S.No', render: (_row, index) => index + 1 },
        {
          key: 'business',
          header: 'Business',
          render: (row) => (
            <>
              <span className="data-table__primary">{row.businessName}</span>
              <span className="data-table__secondary d-block">{row.businessPhone} | {row.businessEmail}</span>
            </>
          ),
        },
        { key: 'plan', header: 'Plan Purchased', render: (row) => row.planLabel },
        { key: 'planStatus', header: 'Plan Status', render: (row) => <span className={row.planStatusClass}>{row.planStatusLabel}</span> },
        { key: 'workspace', header: 'Workspace', render: (row) => <span className={row.workspaceStatusClass}>{row.workspaceStatusLabel}</span> },
        { key: 'start', header: 'Start', render: (row) => row.startDate },
        { key: 'end', header: 'End', render: (row) => row.endDate },
        { key: 'remaining', header: 'Remaining', render: (row) => `${row.daysRemaining} day${row.daysRemaining === 1 ? '' : 's'}` },
      ]}
      renderActions={(row) => (
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
      )}
    />
  );
};

export default SubscriptionTransactionsTable;
