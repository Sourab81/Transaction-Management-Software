import {
  extractFirstRecordWithKeys,
  readNumberValue,
  type UnknownRecord,
} from './legacy-record';

export interface DashboardSummary {
  collectedAmount: number;
  pendingTransactions: number;
  customerCount: number;
  activeServiceCount: number;
}

export const mapDashboardSummaryResponse = (payload: unknown): DashboardSummary | null => {
  const summaryRecord = extractFirstRecordWithKeys(
    payload,
    [
      'collected_amount',
      'collectedAmount',
      'pending_transactions',
      'pendingTransactions',
      'customer_count',
      'customerCount',
      'active_service_count',
      'activeServiceCount',
    ],
    ['data', 'summary', 'result'],
  );

  if (!summaryRecord) {
    return null;
  }

  return {
    collectedAmount: readNumberValue(summaryRecord as UnknownRecord, ['collected_amount', 'collectedAmount', 'total_collection', 'totalCollection']) || 0,
    pendingTransactions: readNumberValue(summaryRecord as UnknownRecord, ['pending_transactions', 'pendingTransactions', 'pending_count', 'pendingCount']) || 0,
    customerCount: readNumberValue(summaryRecord as UnknownRecord, ['customer_count', 'customerCount', 'total_customers', 'totalCustomers']) || 0,
    activeServiceCount: readNumberValue(summaryRecord as UnknownRecord, ['active_service_count', 'activeServiceCount', 'service_count', 'serviceCount']) || 0,
  };
};

