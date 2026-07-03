import type { BusinessCustomer } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

const readStatusNumber = (record: UnknownRecord) => {
  const numericStatus = readNumberValue(record, ['status', 'is_active', 'isActive']);
  if (typeof numericStatus === 'number') {
    return numericStatus === 0 ? 'Inactive' : 'Active';
  }

  return normalizeActiveStatus(readStringValue(record, ['status', 'is_active', 'isActive']));
};

export const mapCustomerRecord = (record: UnknownRecord): BusinessCustomer | null => {
  const id = readStringValue(record, ['id', 'customer_id', 'cust_id', 'user_id']);
  const name = readStringValue(record, ['customerName', 'customer_name', 'name', 'full_name', 'fullName']);

  if (!id || !name) {
    return null;
  }

  const phone = readStringValue(record, ['mobileNo', 'mobile_no', 'phone', 'mobile', 'customer_phone', 'phone_number']) || 'Not added';
  const addedDate = readStringValue(record, ['addedDate', 'added_date', 'joined_date', 'joinedDate', 'created_at', 'createdAt', 'date']) || undefined;

  return {
    id,
    customerCode: readStringValue(record, ['customerCode', 'customer_code', 'code', 'customer_id_code']) || undefined,
    name,
    customerName: name,
    phone,
    mobileNo: phone,
    email: readStringValue(record, ['email', 'customer_email', 'user_email']) || undefined,
    dob: readStringValue(record, ['dob', 'date_of_birth', 'dateOfBirth']) || undefined,
    address: readStringValue(record, ['address']) || null,
    remark: readStringValue(record, ['remark', 'remarks']) || null,
    colorId: readStringValue(record, ['colorId', 'color_id', 'customer_color_id', 'customerColorId']) || null,
    color: readStringValue(record, ['color', 'color_code', 'colorCode', 'customer_color', 'customerColor', 'customer_colour']) || null,
    status: readStatusNumber(record),
    joinedDate: addedDate,
    addedDate,
    updatedDate: readStringValue(record, ['updatedDate', 'updated_date', 'updated_at', 'updatedAt']) || undefined,
  };
};

export const mapCustomersResponse = (payload: unknown) => {
  return extractCollectionItems(payload, ['data', 'customers', 'items', 'rows', 'records']).reduce<BusinessCustomer[]>((customers, entry) => {
    if (!isRecord(entry)) {
      return customers;
    }

    const mappedCustomer = mapCustomerRecord(entry);
    if (mappedCustomer) {
      customers.push(mappedCustomer);
    }

    return customers;
  }, []);
};
