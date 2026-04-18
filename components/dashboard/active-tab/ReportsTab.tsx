'use client';

import SectionHero from '../SectionHero';
import ReportsTable from '../../tables/ReportsTable';
import { FaChartLine } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import type { DashboardTabContext } from './types';

interface ReportsTabProps {
  ctx: DashboardTabContext;
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
  const reportsUi = getModuleUi('reports');
  const generateReportAction = canManageModule('reports')
    ? {
        label: 'Generate Report',
        onClick: () => handleQuickAction('generate-report'),
      }
    : undefined;

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
        {reports.length === 0 ? (
          <EmptyState
            eyebrow={reportsUi?.label}
            title={reportsUi?.emptyTitle || 'No reports generated yet'}
            description={reportsUi?.emptyDescription || 'Generate a report to review exports, summaries, and audit snapshots.'}
            action={generateReportAction}
          />
        ) : (
          <ReportsTable
            reports={reports}
            onView={handleViewReport}
            onDelete={canDeleteModule('reports') ? (id: string) => handleDeleteRecord('DELETE_REPORT', id) : undefined}
          />
        )}
      </div>
    </div>
  );
}
