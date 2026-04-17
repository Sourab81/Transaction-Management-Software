'use client';

import SectionHero from '../SectionHero';
import ReportsTable from '../../tables/ReportsTable';
import { FaChartLine } from 'react-icons/fa';

interface ReportsTabProps {
  ctx: any;
}

export default function ReportsTab({ ctx }: ReportsTabProps) {
  const {
    renderSummaryCards,
    reportSummary,
    reports,
    handleQuickAction,
    handleViewReport,
    handleDeleteRecord,
    canManageModule,
    canDeleteModule,
  } = ctx;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Reports Center"
          title="Make data-driven decisions"
          description="View the latest insights, exports, and engagement summaries."
          action={canManageModule('reports') ? {
            label: 'Generate',
            icon: <FaChartLine />,
            onClick: () => handleQuickAction('generate-report'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(reportSummary)}

      <div className="col-12">
        <ReportsTable
          reports={reports}
          onView={handleViewReport}
          onDelete={canDeleteModule('reports') ? (id: string) => handleDeleteRecord('DELETE_REPORT', id) : undefined}
        />
      </div>
    </div>
  );
}
