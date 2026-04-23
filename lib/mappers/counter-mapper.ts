import type { Counter } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export const mapCounterRecord = (record: UnknownRecord): Counter | null => {
  const id = readStringValue(record, ['id', 'counter_id', 'department_id']);
  const name = readStringValue(record, ['name', 'counter_name', 'department_name', 'title']);

  if (!id || !name) {
    return null;
  }

  const code = readStringValue(record, ['code', 'department_code', 'counter_code']) || `CTR-${id}`;
  const openingBalance = readNumberValue(record, ['opening_balance', 'openingBalance']) || 0;
  const currentBalance = readNumberValue(record, ['current_balance', 'currentBalance', 'balance']) || openingBalance;
  const rawStatus = readStringValue(record, ['status', 'is_active']);

  return {
    id,
    name,
    code,
    openingBalance,
    currentBalance,
    status: normalizeActiveStatus(rawStatus),
  };
};

export const mapCountersResponse = (payload: unknown) => {
  return extractCollectionItems(payload, ['data', 'counters', 'departments', 'items', 'rows']).reduce<Counter[]>((counters, entry) => {
    if (!isRecord(entry)) {
      return counters;
    }

    const mappedCounter = mapCounterRecord(entry);
    if (mappedCounter) {
      counters.push(mappedCounter);
    }

    return counters;
  }, []);
};

