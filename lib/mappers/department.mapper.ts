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

export interface DepartmentRecord {
  departmentId: string;
  departmentName: string;
  departmentDisplay?: string;
  remark?: string;
  status: 'Active' | 'Inactive';
  linkedAccountIds: string[];
  defaultAccountId?: string;
  createdAt?: string;
  openingBalance: number;
  currentBalance: number;
}

const readIdArray = (record: UnknownRecord, keys: string[]) => {
  const arrayValue = readArrayValue(record, keys);

  if (!arrayValue) {
    return [];
  }

  return arrayValue
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        return entry.trim();
      }

      if (typeof entry === 'number' && Number.isFinite(entry)) {
        return String(entry);
      }

      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
};

export const mapDepartmentRecord = (record: UnknownRecord): DepartmentRecord | null => {
  const departmentId = readStringValue(record, ['id', 'counter_id', 'department_id']);
  const departmentName = readStringValue(record, ['name', 'counter_name', 'department_name']);

  if (!departmentId || !departmentName) {
    return null;
  }

  const linkedAccountIds = readIdArray(record, ['account_ids', 'bank_account_ids']);
  const defaultAccountId = readStringValue(record, ['default_account_id', 'default_bank_account_id']);
  const createdAt = readStringValue(record, ['create_date', 'createdAt', 'created_at', 'added_date']);
  const remark = readStringValue(record, ['remark', 'remarks', 'note']);
  const rawStatus = readStringValue(record, ['status', 'is_active']);
  const departmentDisplay = readStringValue(record, ['department_display', 'departmentDisplay']);

  return {
    departmentId,
    departmentName,
    ...(departmentDisplay ? { departmentDisplay } : {}),
    linkedAccountIds,
    openingBalance: readNumberValue(record, ['opening_balance', 'openingBalance']) ?? 0,
    currentBalance: readNumberValue(record, ['current_balance', 'currentBalance', 'balance']) ?? 0,
    status: normalizeActiveStatus(rawStatus),
    ...(defaultAccountId ? { defaultAccountId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(remark ? { remark } : {}),
  };
};

export const mapDepartmentsResponse = (payload: unknown) =>
  extractCollectionItems(payload, ['data', 'counters', 'departments', 'items', 'rows']).reduce<DepartmentRecord[]>((departments, entry) => {
    if (!isRecord(entry)) {
      return departments;
    }

    const mappedDepartment = mapDepartmentRecord(entry);
    if (mappedDepartment) {
      departments.push(mappedDepartment);
    }

    return departments;
  }, []);

export const mapDepartmentToCounter = (department: DepartmentRecord): Counter => ({
  id: department.departmentId,
  name: department.departmentName,
  code: Number.isFinite(Number(department.departmentId))
    ? `DPT-${String(Number(department.departmentId)).padStart(4, '0')}`
    : department.departmentId,
  departmentDisplay: department.departmentDisplay,
  linkedAccountIds: department.linkedAccountIds,
  defaultAccountId: department.defaultAccountId,
  linkedAccountId: department.defaultAccountId,
  openingBalance: department.openingBalance,
  currentBalance: department.currentBalance,
  status: department.status,
  remark: department.remark,
  date: department.createdAt,
});
