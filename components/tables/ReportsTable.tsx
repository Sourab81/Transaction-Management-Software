import React from 'react';
import { FaEye, FaTrashAlt } from 'react-icons/fa';
import type { ReportItem } from '../../lib/store';

interface ReportsTableProps {
  reports: ReportItem[];
  onView?: (report: ReportItem) => void;
  onDelete?: (reportId: string) => void;
}

const getStatusClass = (status: ReportItem['status']) => {
  if (status === 'Ready') return 'status-chip status-chip--ready';
  if (status === 'Scheduled') return 'status-chip status-chip--scheduled';
  return 'status-chip status-chip--draft';
};

const ReportsTable: React.FC<ReportsTableProps> = ({ reports, onView, onDelete }) => {
  const hasActions = Boolean(onView || onDelete);

  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Reports</p>
          <h3 className="table-panel__title">Reporting queue</h3>
          <p className="table-panel__copy">Generated exports, owners, and schedule state in a simple list.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Report</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={7}>No report records found.</td>
              </tr>
            ) : (
              reports.map((report, index) => (
                <tr key={report.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Report"><span className="data-table__primary">{report.name}</span></td>
                  <td data-label="Type">{report.type}</td>
                  <td data-label="Owner">{report.owner}</td>
                  <td data-label="Status"><span className={getStatusClass(report.status)}>{report.status}</span></td>
                  <td data-label="Date">{report.date}</td>
                  <td data-label="Actions">
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

export default ReportsTable;
