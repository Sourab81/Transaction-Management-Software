import {
  extractCollectionItems,
  extractFirstRecordWithKeys,
  isRecord,
  normalizeActiveStatus,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';
import type { CustomerColor } from '../api/customerColors';

export const mapCustomerColorRecord = (record: UnknownRecord): CustomerColor | null => {
  const id = readStringValue(record, ['id', 'color_id', 'customer_color_id', 'customerColorId']);
  const name = readStringValue(record, ['name', 'color_name', 'colorName']);
  const hexCode = readStringValue(record, ['hexCode', 'hex_code', 'color_code', 'colorCode', 'color', 'customer_color']);

  if (!id || !name || !hexCode) {
    return null;
  }

  return {
    id,
    name,
    hexCode,
    remark: readStringValue(record, ['remark', 'remarks', 'note']) || null,
    status: normalizeActiveStatus(readStringValue(record, ['status', 'is_active', 'isActive'])),
    addedByName: readStringValue(record, ['addedByName', 'added_by_name', 'added_by']) || null,
    addedDate: readStringValue(record, ['addedDate', 'added_date', 'created_at', 'createdAt']) || '',
    updatedDate: readStringValue(record, ['updatedDate', 'updated_date', 'updated_at', 'updatedAt']) || undefined,
  };
};

export const mapCustomerColorsResponse = (payload: unknown) =>
  extractCollectionItems(payload, ['data', 'colors', 'customer_colors', 'customerColors', 'rows', 'records'])
    .reduce<CustomerColor[]>((colors, entry) => {
      if (!isRecord(entry)) return colors;
      const mappedColor = mapCustomerColorRecord(entry);
      if (mappedColor) colors.push(mappedColor);
      return colors;
    }, []);

export const mapCustomerColorResponse = (payload: unknown) => {
  const record = extractFirstRecordWithKeys(payload, ['id', 'color_id', 'customer_color_id', 'name', 'color_name']);
  return record ? mapCustomerColorRecord(record) : null;
};
