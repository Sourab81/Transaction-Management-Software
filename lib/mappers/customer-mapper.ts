import type { BusinessCustomer } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export const mapCustomerRecord = (record: UnknownRecord): BusinessCustomer | null => {
  const id = readStringValue(record, ['id', 'customer_id', 'cust_id', 'user_id']);
  const name = readStringValue(record, ['name', 'customer_name', 'full_name', 'fullName']);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    phone: readStringValue(record, ['phone', 'mobile', 'mobile_no', 'customer_phone', 'phone_number']) || 'Not added',
    email: readStringValue(record, ['email', 'customer_email', 'user_email']) || undefined,
    status: normalizeActiveStatus(readStringValue(record, ['status', 'is_active'])),
    joinedDate: readStringValue(record, ['joined_date', 'joinedDate', 'created_at', 'createdAt', 'date']) || undefined,
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
