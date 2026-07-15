'use client';

import { useState } from 'react';
import SectionHero from '../SectionHero';
import ReportsTable from '../../tables/ReportsTable';
import LedgerReportView from '../../reports/LedgerReportView';
import DayReportView from '../../reports/DayReportView';
import TransactionReportView from '../../reports/TransactionReportView';
import LogReportView from '../../reports/LogReportView';
import { FaChartLine, FaFileAlt, FaHistory, FaTools } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import type { DashboardTabContext } from './types';

interface ReportsTabProps {
  ctx: DashboardTabContext;
}

type ReportPill = 'ledger' | 'daily' | 'log' | 'service';

const PILLS: { id: ReportPill; label: string; icon: React.ReactNode }[] = [
  { id: 'ledger', label: 'Bank/Department Report', icon: <FaFileAlt /> },
  { id: 'daily', label: 'Daily Report', icon: <FaChartLine /> },
  { id: 'log', label: 'Log Report', icon: <FaHistory /> },
  { id: 'service', label: 'Transaction Report', icon: <FaTools /> },
];

export default function ReportsTab({ ctx }: ReportsTabProps) {
  const {
    renderSummaryCards,
    reportSummary,
    isReportsLoading,
    reports,
    handleQuickAction,
    handleViewReport,
    handleDeleteRecord,
    canManageModule,
    canDeleteModule,
  } = ctx;
  const [activePill, setActivePill] = useState<ReportPill>('ledger');
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
        <div className="form-section-card">
          <div className="d-flex flex-wrap gap-2">
            {PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                className={`btn-app ${activePill === pill.id ? 'btn-app-primary' : 'btn-app-secondary'}`}
                onClick={() => setActivePill(pill.id)}
              >
                {pill.icon}
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activePill === 'ledger' ? (
        <LedgerReportView ctx={ctx} />
      ) : activePill === 'daily' ? (
        <DayReportView ctx={ctx} />
      ) : activePill === 'service' ? (
        <TransactionReportView ctx={ctx} />
      ) : activePill === 'log' ? (
        <LogReportView />
      ) : (
        <div className="col-12">
          <div className="form-section-card text-center py-5">
            <FaTools className="text-muted mb-3" size={48} />
            <h4>Coming Soon</h4>
            <p className="text-muted mb-0">This report type is under development and will be available in a future update.</p>
          </div>
        </div>
      )}

      {activePill === 'ledger' || activePill === 'daily' || activePill === 'service' || activePill === 'log' ? null : (
        <>
          <div className="col-12">
            {reports.length === 0 && !isReportsLoading ? (
              <EmptyState
                eyebrow={reportsUi?.label}
                title={reportsUi?.emptyTitle || 'No reports generated yet'}
                description={reportsUi?.emptyDescription || 'Generate a report to review exports, summaries, and audit snapshots.'}
                action={generateReportAction}
              />
            ) : (
              <ReportsTable
                reports={reports}
                isLoading={isReportsLoading}
                onView={handleViewReport}
                onDelete={canDeleteModule('reports') ? (id: string) => handleDeleteRecord('DELETE_REPORT', id) : undefined}
              />
            )}
          </div>

          {renderSummaryCards(reportSummary)}
        </>
      )}
    </div>
  );
}
