import { buildDefaultCustomerPermissions } from '../platform-structure';
import type { Business } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readRecordValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';
import { readPermissionsFromSources } from './permission-mapper';
import {
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';

const isBusinessUserRecord = (record: UnknownRecord) => {
  const role = readStringValue(record, ['role'])?.trim();
  const userType = readStringValue(record, ['user_type', 'userType', 'type'])?.toLowerCase();

  // In the admin workspace, "customers" means tenant/business users only.
  // The backend getUsers endpoint returns Admin, Business, and Employee rows
  // together. Current payloads identify account type with user_type; role is
  // now the selected predefined role/template id.
  if (userType) {
    return userType === 'business';
  }

  return role === '2';
};

const getUserRoleTemplateId = (record: UnknownRecord, roleRecord: UnknownRecord | null) =>
  readStringValue(roleRecord, ['id', 'role_id', 'roleId'])
  || readStringValue(record, ['role_template_id', 'roleTemplateId', 'role_id', 'roleId', 'role'])
  || undefined;

const getUserRoleName = (record: UnknownRecord, roleRecord: UnknownRecord | null) =>
  readStringValue(record, ['role_name', 'roleName'])
  || readStringValue(roleRecord, ['role_name', 'roleName', 'name', 'title', 'label'])
  || readStringValue(record, ['role_title', 'roleTitle', 'role_label', 'roleLabel'])
  || undefined;

export const mapBusinessRecord = (record: UnknownRecord): Business | null => {
  if (!isBusinessUserRecord(record)) {
    return null;
  }

  const id = readStringValue(record, ['id', 'business_id', 'user_id']);
  const name = readStringValue(record, ['fullname', 'name', 'business_name', 'company_name', 'username']);
  const roleRecord = readRecordValue(record, ['role', 'role_template', 'roleTemplate']);
  const roleTemplateId = getUserRoleTemplateId(record, roleRecord);
  const roleName = getUserRoleName(record, roleRecord);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    phone: readStringValue(record, ['contact_no', 'phone', 'mobile', 'mobile_no', 'phone_number']) || 'Not added',
    email: readStringValue(record, ['email_id', 'email', 'user_email', 'username']) || '',
    role: readStringValue(record, ['role']) || undefined,
    role_id: readStringValue(record, ['role_id']) || undefined,
    roleTemplateId,
    role_template_id: readStringValue(record, ['role_template_id']) || undefined,
    role_name: readStringValue(record, ['role_name']) || undefined,
    roleName: readStringValue(record, ['roleName']) || undefined,
    selectedRoleName: roleName,
    status: normalizeActiveStatus(readStringValue(record, ['status', 'is_active'])),
    joinedDate: readStringValue(record, ['create_date', 'created_at', 'createdAt', 'joined_date', 'joinedDate']) || undefined,
    onboardingCompleted: true,
    onboardingStep: 'dashboard',
    permissions: readPermissionsFromSources(record) || buildDefaultCustomerPermissions(),
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
