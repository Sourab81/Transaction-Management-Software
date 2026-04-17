import React from 'react';
import { FaEye, FaTrashAlt } from 'react-icons/fa';
import type { HistoryEvent } from '../../lib/store';

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
    <section className="table-panel" style={{height: '50rem', overflowY: 'auto'}}>
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">History</p>
          <h3 className="table-panel__title">Audit timeline</h3>
          <p className="table-panel__copy">Events, actors, and statuses for every important workflow update.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Event</th>
              <th>Module</th>
              <th>Actor</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr className="data-table__empty-row">
                <td className="table-empty" colSpan={7}>No history records found.</td>
              </tr>
            ) : (
              events.map((event, index) => (
                <tr key={event.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Event"><span className="data-table__primary">{event.title}</span></td>
                  <td data-label="Module">{event.module}</td>
                  <td data-label="Actor">{event.actor}</td>
                  <td data-label="Status"><span className={getStatusClass(event.status)}>{event.status}</span></td>
                  <td data-label="Date">{event.date}</td>
                  <td data-label="Actions">
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

export default HistoryTable;
