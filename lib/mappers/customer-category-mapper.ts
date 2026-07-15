import {
  extractCollectionItems,
  extractFirstRecordWithKeys,
  isRecord,
  normalizeActiveStatus,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';
import type { CustomerCategory } from '../api/customerCategories';

export const mapCustomerCategoryRecord = (record: UnknownRecord): CustomerCategory | null => {
  const id = readStringValue(record, ['id', 'category_id', 'customer_category_id']);
  const name = readStringValue(record, ['name', 'category_name', 'categoryName']);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    status: normalizeActiveStatus(readStringValue(record, ['status', 'is_active', 'isActive'])),
    addedByName: readStringValue(record, ['addedByName', 'added_by_name', 'added_by']) || null,
    addedDate: readStringValue(record, ['addedDate', 'added_date', 'created_at', 'createdAt']) || '',
    updatedDate: readStringValue(record, ['updatedDate', 'updated_date', 'updated_at', 'updatedAt']) || undefined,
  };
};

export const mapCustomerCategoriesResponse = (payload: unknown) =>
  extractCollectionItems(payload, ['data', 'categories', 'customer_categories', 'customerCategories', 'rows', 'records'])
    .reduce<CustomerCategory[]>((categories, entry) => {
      if (!isRecord(entry)) return categories;
      const mapped = mapCustomerCategoryRecord(entry);
      if (mapped) categories.push(mapped);
      return categories;
    }, []);

export const mapCustomerCategoryResponse = (payload: unknown) => {
  const record = extractFirstRecordWithKeys(payload, ['id', 'category_id', 'customer_category_id', 'name', 'category_name']);
  return record ? mapCustomerCategoryRecord(record) : null;
};
