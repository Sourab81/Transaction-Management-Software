import { buildDefaultCustomerPermissions } from '../platform-structure';
import type { Business } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';
import {
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';

const isBusinessUserRecord = (record: UnknownRecord) => {
  const role = readStringValue(record, ['role'])?.trim();
  const userType = readStringValue(record, ['user_type', 'userType', 'type'])?.toLowerCase();

  // In the admin workspace, "customers" means tenant/business users only.
  // The backend getUsers endpoint returns Admin, Business, and Employee rows
  // together, so role 2/user_type Business is the boundary for this table.
  return role === '2' || userType === 'business';
};

export const mapBusinessRecord = (record: UnknownRecord): Business | null => {
  if (!isBusinessUserRecord(record)) {
    return null;
  }

  const id = readStringValue(record, ['id', 'business_id', 'user_id']);
  const name = readStringValue(record, ['fullname', 'name', 'business_name', 'company_name', 'username']);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    phone: readStringValue(record, ['contact_no', 'phone', 'mobile', 'mobile_no', 'phone_number']) || 'Not added',
    email: readStringValue(record, ['email_id', 'email', 'user_email', 'username']) || '',
    password: '',
    status: normalizeActiveStatus(readStringValue(record, ['status', 'is_active'])),
    joinedDate: readStringValue(record, ['create_date', 'created_at', 'createdAt', 'joined_date', 'joinedDate']) || undefined,
    onboardingCompleted: true,
    onboardingStep: 'dashboard',
    permissions: buildDefaultCustomerPermissions(),
  };
};

export const mapBusinessesResponse = (payload: unknown) => {
  return extractCollectionItems(payload, ['data', 'users', 'businesses', 'items', 'rows', 'records']).reduce<Business[]>((businesses, entry) => {
    if (!isRecord(entry)) {
      return businesses;
    }

    const mappedBusiness = mapBusinessRecord(entry);
    if (mappedBusiness) {
      businesses.push(mappedBusiness);
    }

    return businesses;
  }, []);
};

export interface BusinessesPage {
  businesses: Business[];
  pagination: BackendPagination;
}

export const mapBusinessesPageResponse = (
  payload: unknown,
  requestedPage = 1,
  requestedLimit = 10,
): BusinessesPage => {
  const businesses = mapBusinessesResponse(payload);

  return {
    businesses,
    pagination: readBackendPagination(payload, businesses.length, requestedPage, requestedLimit),
  };
};
