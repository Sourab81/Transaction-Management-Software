'use client';

import { directBackendPostJson } from './direct-backend';
import {
  extractCollectionItems,
  isRecord,
  readNumberValue,
  readRecordValue,
  readStringValue,
} from '../mappers/legacy-record';
import { readBackendPagination, type BackendPagination } from './pagination';

export interface LedgerEntry {
  entryId: number;
  entryDate: string;
  sourceType: string;
  customer: string;
  customerCode: string;
  entityType: 'counter' | 'account';
  entityId: number;
  entityName: string;
  otherEntityName: string;
  debit: number;
  credit: number;
  remark: string;
  addedByName: string;
  balance: number;
}

export interface LedgerEntity {
  type: 'counter' | 'account';
  id: number;
  name: string;
  openingBalance: number;
}

export interface LedgerSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface LedgerReportFilters {
  dateFrom: string;
  dateTo: string;
  counterIds: string[];
  accountIds: string[];
  page: number;
  limit: number;
}

export interface LedgerReportData {
  entities: LedgerEntity[];
  records: LedgerEntry[];
  summary: LedgerSummary;
  pagination: BackendPagination;
}

export interface LedgerReportResponse {
  status: boolean;
  message: string;
  data: LedgerReportData;
}

const mapLedgerEntry = (record: Record<string, unknown>, index: number): LedgerEntry | null => {
  return {
    entryId: index + 1,
    entryDate: readStringValue(record, ['entry_date', 'entryDate']) || '',
    sourceType: readStringValue(record, ['source_type', 'sourceType']) || '',
    customer: readStringValue(record, ['customer']) || '',
    customerCode: readStringValue(record, ['customer_code', 'customerCode']) || '',
    entityType: (readStringValue(record, ['entity_type', 'entityType']) || 'counter') as 'counter' | 'account',
    entityId: readNumberValue(record, ['entity_id', 'entityId']) ?? 0,
    entityName: readStringValue(record, ['entity_name', 'entityName']) || '',
    otherEntityName: readStringValue(record, ['other_entity_name', 'otherEntityName']) || '',
    debit: readNumberValue(record, ['debit']) ?? 0,
    credit: readNumberValue(record, ['credit']) ?? 0,
    remark: readStringValue(record, ['remark']) || '',
    addedByName: readStringValue(record, ['added_by_name', 'addedByName']) || 'System',
    balance: readNumberValue(record, ['balance']) ?? 0,
  };
};

const mapLedgerEntity = (record: Record<string, unknown>): LedgerEntity => ({
  type: (readStringValue(record, ['type']) || 'counter') as 'counter' | 'account',
  id: readNumberValue(record, ['id']) ?? 0,
  name: readStringValue(record, ['name']) || '',
  openingBalance: readNumberValue(record, ['opening_balance', 'openingBalance']) ?? 0,
});

const mapLedgerSummary = (payload: unknown): LedgerSummary => {
  const source = isRecord(payload) ? payload : null;
  const summary = readRecordValue(source, ['data', 'summary']);

  return {
    openingBalance: readNumberValue(summary, ['opening_balance', 'openingBalance']) ?? 0,
    totalDebit: readNumberValue(summary, ['total_debit', 'totalDebit']) ?? 0,
    totalCredit: readNumberValue(summary, ['total_credit', 'totalCredit']) ?? 0,
    closingBalance: readNumberValue(summary, ['closing_balance', 'closingBalance']) ?? 0,
  };
};

export const getLedgerReport = async (filters: LedgerReportFilters): Promise<LedgerReportResponse> => {
  const body: Record<string, unknown> = {
    from_date: filters.dateFrom,
    to_date: filters.dateTo,
    page_no: filters.page,
    limit: filters.limit,
  };

  if (filters.counterIds.length > 0) {
    body.counter_ids = filters.counterIds;
  }

  if (filters.accountIds.length > 0) {
    body.account_ids = filters.accountIds;
  }

  const response = await directBackendPostJson<LedgerReportResponse>('reports/ledger', body);

  if (!response || !response.status) {
    throw new Error(response?.message || 'Failed to fetch ledger report.');
  }

  const records = (extractCollectionItems(response.data, ['records']) as Record<string, unknown>[])
    .reduce<LedgerEntry[]>((rows, entry, index) => {
      const row = mapLedgerEntry(entry, index);
      if (row) rows.push(row);
      return rows;
    }, []);

  const summary = mapLedgerSummary(response);

  const pagination = readBackendPagination(
    response.data,
    records.length,
    filters.page,
    filters.limit,
  );

  return {
    status: true,
    message: response.message,
    data: {
      entities: ((response.data?.entities || []) as unknown as Record<string, unknown>[]).map(mapLedgerEntity),
      records,
      summary,
      pagination,
    },
  };
};
