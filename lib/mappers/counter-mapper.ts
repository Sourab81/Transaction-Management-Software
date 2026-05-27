import type { Counter } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readArrayValue,
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

  const departmentDisplay = readStringValue(record, ['department_display', 'departmentDisplay']);
  const fallbackCode = Number.isFinite(Number(id))
    ? `DPT-${String(Number(id)).padStart(4, '0')}`
    : id;
  const code = readStringValue(record, ['code', 'department_code', 'counter_code']) || fallbackCode;
  const openingBalance = readNumberValue(record, ['opening_balance', 'openingBalance']) ?? 0;
  const currentBalance = readNumberValue(record, ['current_balance', 'currentBalance', 'balance']) ?? 0;
  const rawStatus = readStringValue(record, ['status', 'is_active']);
  const remark = readStringValue(record, ['remark', 'remarks', 'note']);
  const date = readStringValue(record, ['date', 'create_date', 'added_date', 'created_at', 'createdAt']);
  const rawLinkedAccountIds = readArrayValue(record, ['account_ids', 'bank_account_ids']) ?? [];
  const linkedAccountIds = rawLinkedAccountIds
        .map((accountId) => typeof accountId === 'number' || typeof accountId === 'string' ? String(accountId) : '')
        .filter(Boolean);
  const defaultAccountId = readStringValue(record, ['default_account_id', 'default_bank_account_id']);

  return {
    id,
    name,
    code,
    ...(departmentDisplay ? { departmentDisplay } : {}),
    ...(linkedAccountIds.length > 0 ? { linkedAccountIds } : {}),
    ...(defaultAccountId ? { defaultAccountId, linkedAccountId: defaultAccountId } : {}),
    openingBalance,
    currentBalance,
    status: normalizeActiveStatus(rawStatus),
    ...(remark ? { remark } : {}),
    ...(date ? { date } : {}),
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
