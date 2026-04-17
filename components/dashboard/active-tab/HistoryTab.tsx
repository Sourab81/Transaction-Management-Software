'use client';

import SectionHero from '../SectionHero';
import HistoryTable from '../../tables/HistoryTable';
import { FaHistory } from 'react-icons/fa';

interface HistoryTabProps {
  ctx: any;
}

export default function HistoryTab({ ctx }: HistoryTabProps) {
  const {
    renderSummaryCards,
    historySummary,
    filteredHistoryEvents,
    handleQuickAction,
    handleViewHistory,
    handleDeleteRecord,
    canDeleteModule,
  } = ctx;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="System History"
          title="Track past activity"
          description="Review audit logs, events, and history details for every important change."
          action={{
            label: 'Show Failed',
            icon: <FaHistory />,
            onClick: () => handleQuickAction('filter-history'),
          }}
        />
      </div>

      {renderSummaryCards(historySummary)}

      <div className="col-12">
        <HistoryTable
          events={filteredHistoryEvents}
          onView={handleViewHistory}
          onDelete={canDeleteModule('history') ? (id: string) => handleDeleteRecord('DELETE_HISTORY_EVENT', id) : undefined}
        />
      </div>
    </div>
  );
}
