import React from 'react';
import { FaEye, FaTrashAlt } from 'react-icons/fa';
import type { ReportItem } from '../../lib/store';
import DataTable from './DataTable';

interface ReportsTableProps {
  reports: ReportItem[];
  onView?: (report: ReportItem) => void;
  onDelete?: (reportId: string) => void;
  isLoading?: boolean;
}

const getStatusClass = (status: ReportItem['status']) => {
  if (status === 'Ready') return 'status-chip status-chip--ready';
  if (status === 'Scheduled') return 'status-chip status-chip--scheduled';
  return 'status-chip status-chip--draft';
};

const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  onView,
  onDelete,
  isLoading = false,
}) => {
  const hasActions = Boolean(onView || onDelete);

  return (
    <DataTable
      rows={reports}
      getRowKey={(report) => report.id}
      eyebrow="Reports"
      title="Reporting queue"
      copy="Generated exports, owners, and schedule state in a simple list."
      emptyLabel="No report records found."
      isLoading={isLoading}
      columns={[
        { key: 'serial', header: 'S.No', render: (_report, index) => index + 1 },
        { key: 'report', header: 'Report', render: (report) => <span className="data-table__primary">{report.name}</span> },
        { key: 'type', header: 'Type', render: (report) => report.type },
        { key: 'owner', header: 'Owner', render: (report) => report.owner },
        { key: 'status', header: 'Status', render: (report) => <span className={getStatusClass(report.status)}>{report.status}</span> },
        { key: 'date', header: 'Date', render: (report) => report.date },
      ]}
      renderActions={(report) => (
        <div className="table-actions">
          {onView && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onView(report)}>
              <FaEye size={12} />
              View
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(report.id)}>
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

export default ReportsTable;
