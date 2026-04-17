'use client';

import SectionHero from '../SectionHero';
import NotificationCenter from '../NotificationCenter';
import HistoryTable from '../../tables/HistoryTable';
import { FaHistory } from 'react-icons/fa';

interface ReminderTabProps {
  ctx: any;
}

export default function ReminderTab({ ctx }: ReminderTabProps) {
  const {
    renderSummaryCards,
    reminderSummary,
    notifications,
    handleDismissNotification,
    handleQuickAction,
    filteredHistoryEvents,
    handleViewHistory,
    handleDeleteRecord,
    canDeleteModule,
    canAccessModuleForSession,
  } = ctx;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Reminder Center"
          title="Track alerts and follow-ups"
          description="Review notifications, failed events, and pending updates without leaving the main workflow."
          action={{
            label: 'Show Failed',
            icon: <FaHistory />,
            onClick: () => handleQuickAction('filter-history'),
          }}
        />
      </div>

      {renderSummaryCards(reminderSummary)}

      <div className="col-12 col-xl-5">
        <NotificationCenter
          notifications={notifications}
          onDismiss={handleDismissNotification}
        />
      </div>

      <div className="col-12 col-xl-7">
        <HistoryTable
          events={filteredHistoryEvents}
          onView={handleViewHistory}
          onDelete={canDeleteModule('history') ? (id: string) => handleDeleteRecord('DELETE_HISTORY_EVENT', id) : undefined}
        />
      </div>
    </div>
  );
}
