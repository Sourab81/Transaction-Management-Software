import { readBackendPagination, type BackendPagination } from '../api/pagination';
import {
  extractCollectionItems,
  isRecord,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export interface ActivityLogRow {
  id: number;
  businessId: number;
  userId: number;
  userName: string;
  userType: string;
  logType: string;
  operation: string;
  ipAddress: string;
  userAgent: string;
  osType: string;
  beforeData: unknown | null;
  afterData: unknown | null;
  remark: string;
  referenceType: string;
  referenceId: number | null;
  addedDate: string;
}

export interface ActivityLogResponse {
  status: boolean;
  message: string;
  data: ActivityLogRow[];
  pagination: BackendPagination;
}

const mapActivityLogRow = (record: UnknownRecord): ActivityLogRow | null => {
  const id = readNumberValue(record, ['id']);
  if (!id) return null;

  return {
    id,
    businessId: readNumberValue(record, ['business_id', 'businessId']) || 0,
    userId: readNumberValue(record, ['user_id', 'userId']) || 0,
    userName: readStringValue(record, ['user_name', 'userName']) || '',
    userType: readStringValue(record, ['user_type', 'userType']) || '',
    logType: readStringValue(record, ['log_type', 'logType']) || '',
    operation: readStringValue(record, ['operation']) || '',
    ipAddress: readStringValue(record, ['ip_address', 'ipAddress']) || '',
    userAgent: readStringValue(record, ['user_agent', 'userAgent']) || '',
    osType: readStringValue(record, ['os_type', 'osType']) || '',
    beforeData: isRecord(record.before_data) ? record.before_data : (record.beforeData ?? null),
    afterData: isRecord(record.after_data) ? record.after_data : (record.afterData ?? null),
    remark: readStringValue(record, ['remark']) || '',
    referenceType: readStringValue(record, ['reference_type', 'referenceType']) || '',
    referenceId: readNumberValue(record, ['reference_id', 'referenceId']) || null,
    addedDate: readStringValue(record, ['added_date', 'addedDate']) || '',
  };
};

export const mapActivityLogResponse = (payload: unknown): ActivityLogResponse => {
  const records = extractCollectionItems(payload, ['data', 'records']);
  const data = records.reduce<ActivityLogRow[]>((rows, entry) => {
    if (!isRecord(entry)) return rows;
    const row = mapActivityLogRow(entry);
    if (row) rows.push(row);
    return rows;
  }, []);

  const pagination = readBackendPagination(payload, data.length, 1, 50);

  return {
    status: true,
    message: '',
    data,
    pagination,
  };
};
