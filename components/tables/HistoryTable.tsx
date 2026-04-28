import React from 'react';
import { FaEye, FaTrashAlt } from 'react-icons/fa';
import type { HistoryEvent } from '../../lib/store';
import ReusableListTable from '../common/ReusableListTable';

interface HistoryTableProps {
  events: HistoryEvent[];
  onView?: (event: HistoryEvent) => void;
  onDelete?: (eventId: string) => void;
}

const getStatusClass = (status: HistoryEvent['status']) => {
  if (status === 'Completed') return 'status-chip status-chip--completed';
  if (status === 'Pending') return 'status-chip status-chip--pending';
  return 'status-chip status-chip--failed';
};

const HistoryTable: React.FC<HistoryTableProps> = ({ events, onView, onDelete }) => {
  const hasActions = Boolean(onView || onDelete);

  return (
    <ReusableListTable
      data={events}
      rowKey={(event) => event.id}
      eyebrow="History"
      title="Audit timeline"
      copy="Events, actors, and statuses for every important workflow update."
      emptyMessage="No history records found."
      className="history-table-panel"
      columns={[
        { key: 'serial', header: 'S.No', render: (_event, index) => index + 1 },
        { key: 'event', header: 'Event', render: (event) => <span className="data-table__primary">{event.title}</span> },
        { key: 'module', header: 'Module', render: (event) => event.module },
        { key: 'actor', header: 'Actor', render: (event) => event.actor },
        { key: 'status', header: 'Status', render: (event) => <span className={getStatusClass(event.status)}>{event.status}</span> },
        { key: 'date', header: 'Date', render: (event) => event.date },
      ]}
      renderActions={(event) => (
        <div className="table-actions">
          {onView && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onView(event)}>
              <FaEye size={12} />
              View
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(event.id)}>
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

export default HistoryTable;
