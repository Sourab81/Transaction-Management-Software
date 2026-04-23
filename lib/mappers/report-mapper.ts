import type { ReportItem } from '../store';
import {
  extractCollectionItems,
  extractFirstRecordWithKeys,
  isRecord,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

const normalizeReportStatus = (value: string | null): ReportItem['status'] => {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'draft') return 'Draft';
  if (normalizedValue === 'scheduled') return 'Scheduled';

  return 'Ready';
};

const mapReportSummary = (record: UnknownRecord | null) => {
  if (!record) {
    return undefined;
  }

  return {
    reportDate: readStringValue(record, ['report_date', 'reportDate', 'date']) || new Date().toISOString().split('T')[0],
    transactionCount: readNumberValue(record, ['transaction_count', 'transactionCount']) || 0,
    completedCount: readNumberValue(record, ['completed_count', 'completedCount']) || 0,
    pendingCount: readNumberValue(record, ['pending_count', 'pendingCount']) || 0,
    cancelledCount: readNumberValue(record, ['cancelled_count', 'cancelledCount']) || 0,
    refundedCount: readNumberValue(record, ['refunded_count', 'refundedCount']) || 0,
    grossAmount: readNumberValue(record, ['gross_amount', 'grossAmount']) || 0,
    collectedAmount: readNumberValue(record, ['collected_amount', 'collectedAmount']) || 0,
    outstandingAmount: readNumberValue(record, ['outstanding_amount', 'outstandingAmount']) || 0,
    expenseAmount: readNumberValue(record, ['expense_amount', 'expenseAmount']) || 0,
    netAmount: readNumberValue(record, ['net_amount', 'netAmount']) || 0,
    topService: readStringValue(record, ['top_service', 'topService']) || 'N/A',
    busiestDepartment: readStringValue(record, ['busiest_department', 'busiestDepartment']) || 'N/A',
  };
};

export const mapReportRecord = (record: UnknownRecord): ReportItem | null => {
  const id = readStringValue(record, ['id', 'report_id']);
  const name = readStringValue(record, ['name', 'report_name', 'title']);

  if (!id || !name) {
    return null;
  }

  const summaryRecord = extractFirstRecordWithKeys(
    record,
    ['transaction_count', 'transactionCount', 'gross_amount', 'grossAmount'],
    ['summary', 'data'],
  );

  return {
    id,
    name,
    type: readStringValue(record, ['type', 'report_type', 'category']) || 'General',
    owner: readStringValue(record, ['owner', 'created_by_name', 'createdByName']) || 'System',
    status: normalizeReportStatus(readStringValue(record, ['status', 'report_status'])),
    date: readStringValue(record, ['date', 'report_date', 'reportDate', 'created_at']) || new Date().toISOString().split('T')[0],
    summary: mapReportSummary(summaryRecord),
  };
};

export const mapReportsResponse = (payload: unknown) => {
  return extractCollectionItems(payload, ['data', 'reports', 'items', 'rows', 'records']).reduce<ReportItem[]>((reports, entry) => {
    if (!isRecord(entry)) {
      return reports;
    }

    const mappedReport = mapReportRecord(entry);
    if (mappedReport) {
      reports.push(mappedReport);
    }

    return reports;
  }, []);
};

