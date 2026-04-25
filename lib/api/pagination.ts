import {
  isRecord,
  readNumberValue,
  readRecordValue,
} from '../mappers/legacy-record';

export interface BackendPagination {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export const createFallbackPagination = (
  rowCount: number,
  currentPage = 1,
  limit = 10,
): BackendPagination => ({
  totalRecords: rowCount,
  currentPage,
  totalPages: rowCount > 0 ? Math.max(1, Math.ceil(rowCount / limit)) : 1,
  limit,
});

export const readBackendPagination = (
  payload: unknown,
  rowCount: number,
  requestedPage = 1,
  requestedLimit = 10,
): BackendPagination => {
  const source = isRecord(payload) ? payload : null;
  const pagination = readRecordValue(source, ['pagination']);

  if (!pagination) {
    return createFallbackPagination(rowCount, requestedPage, requestedLimit);
  }

  const limit = readNumberValue(pagination, ['limit']) ?? requestedLimit;
  const totalRecords = readNumberValue(pagination, ['total_records', 'totalRecords']) ?? rowCount;

  return {
    totalRecords,
    currentPage: readNumberValue(pagination, ['current_page', 'currentPage', 'page_no']) ?? requestedPage,
    totalPages: readNumberValue(pagination, ['total_pages', 'totalPages']) ?? Math.max(1, Math.ceil(totalRecords / limit)),
    limit,
  };
};
