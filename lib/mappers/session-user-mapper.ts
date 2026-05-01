import type { LoginApiResponseBody } from '../api/auth';
import type { CustomerPermissions, UserRole } from '../platform-structure';
import {
  extractFirstRecordWithKeys,
  isRecord,
  normalizeEmailAddress,
  readRecordValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';
import { readPermissionsFromSources } from './permission-mapper';

export type LoginAccountType = 'Admin' | 'Business' | 'Employee';

export interface SessionUserCandidate {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType?: LoginAccountType;
  roleTemplateId?: string;
  legacyRoleId?: string;
  businessId?: string;
  departmentId?: string;
  counterId?: string;
  counterName?: string;
  permissions?: CustomerPermissions;
}

export const INVALID_USER_TYPE_LOGIN_MESSAGE =
  'Login succeeded, but the backend response did not identify a valid user type.';
export const UNAUTHORIZED_ADMIN_LOGIN_MESSAGE =
  'Admin account is not authorized for admin access.';

const apiUserTypeKeys = ['user_type', 'userType', 'account_type', 'accountType', 'login_type'];
const apiRoleKeys = ['role', 'role_id', 'roleId', 'user_role', 'userRole'];
const apiEmailKeys = ['email', 'email_id', 'user_email', 'login_email', 'username'];
const apiBusinessIdKeys = ['businessId', 'business_id', 'workspaceId', 'workspace_id', 'company_id'];
const apiDepartmentIdKeys = ['departmentId', 'department_id'];
const apiCounterIdKeys = ['counterId', 'counter_id'];
const apiCounterNameKeys = ['counterName', 'counter_name', 'departmentName', 'department_name'];
const apiIdKeys = ['id', 'user_id', 'admin_id', 'employee_id'];
const apiNameKeys = ['name', 'fullname', 'full_name', 'fullName', 'nickname', 'user_name', 'username', 'business_name', 'company_name'];
const apiTokenKeys = [
  'token',
  'access_token',
  'accessToken',
  'auth_token',
  'authToken',
  'api_token',
  'apiToken',
  'bearer_token',
  'bearerToken',
  'authorization',
  'Authorization',
  'jwt',
];

interface LoginIdentity {
  role: UserRole | null;
  userType?: LoginAccountType;
  roleTemplateId?: string;
  legacyRoleId?: string;
}

const normalizeLoginAccountType = (value: string | null): LoginAccountType | null => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, '_');

  if (normalizedValue === 'admin') return 'Admin';
  if (['business', 'business_user', 'user', 'users', 'customer', 'client'].includes(normalizedValue)) {
    return 'Business';
  }
  if (['employee', 'staff', 'operator', 'staff_user', 'employee_user'].includes(normalizedValue)) {
    return 'Employee';
  }

  return null;
};

const normalizeLegacyApiRole = (value: string | null): UserRole | null => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, '_');

  if (normalizedValue === '1' || normalizedValue === 'admin') return 'Admin';
  if (['3', 'employee', 'staff', 'operator', 'staff_user', 'employee_user'].includes(normalizedValue)) return 'Employee';
  if (['2', 'customer', 'business', 'business_user', 'owner', 'business_owner', 'merchant', 'client'].includes(normalizedValue)) {
    return 'Customer';
  }

  return null;
};

const toInternalRole = (accountType: LoginAccountType): UserRole => {
  if (accountType === 'Admin') return 'Admin';
  if (accountType === 'Employee') return 'Employee';
  return 'Customer';
};

const isAdminRoleId = (value: string | null) => value === '1';

const decodeBase64UrlValue = (value: string) => {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalizedValue.length % 4)) % 4);

  try {
    if (typeof atob !== 'function') {
      return null;
    }

    return atob(`${normalizedValue}${padding}`);
  } catch {
    return null;
  }
};

const parseAccessTokenPayload = (token: string | null): UnknownRecord | null => {
  if (!token) {
    return null;
  }

  const normalizedToken = token.trim().replace(/^Bearer\s+/i, '');
  const [, payloadSegment] = normalizedToken.split('.');

  if (!payloadSegment) {
    return null;
  }

  const decodedPayload = decodeBase64UrlValue(payloadSegment);
  if (!decodedPayload) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(decodedPayload) as unknown;
    return isRecord(parsedPayload) ? parsedPayload : null;
  } catch {
    return null;
  }
};

const inferApiRoleFromRecord = (source: UnknownRecord | null): UserRole | null => {
  if (!source) {
    return null;
  }

  if ('admin_id' in source) return 'Admin';
  if ('employee_id' in source) return 'Employee';

  if (
    'business_id' in source ||
    'workspace_id' in source ||
    'company_id' in source ||
    'business_name' in source ||
    'company_name' in source
  ) {
    return 'Customer';
  }

  return null;
};

const resolveLoginIdentity = (
  body: LoginApiResponseBody | null,
  userRecord: UnknownRecord | null,
  tokenPayload: UnknownRecord | null,
  tokenUserRecord: UnknownRecord | null,
): LoginIdentity => {
  const dataRecord = isRecord(body?.data) ? body.data : null;
  const userTypeValue = readStringValue(userRecord, apiUserTypeKeys)
    || readStringValue(tokenUserRecord, apiUserTypeKeys)
    || readStringValue(dataRecord, apiUserTypeKeys)
    || readStringValue(tokenPayload, apiUserTypeKeys)
    || readStringValue(body as UnknownRecord | null, apiUserTypeKeys);
  const roleValue = readStringValue(userRecord, apiRoleKeys)
    || readStringValue(tokenUserRecord, apiRoleKeys)
    || readStringValue(dataRecord, apiRoleKeys)
    || readStringValue(tokenPayload, apiRoleKeys)
    || readStringValue(body as UnknownRecord | null, apiRoleKeys);

  if (userTypeValue) {
    const accountType = normalizeLoginAccountType(userTypeValue);

    if (!accountType) {
      return {
        role: null,
        legacyRoleId: roleValue || undefined,
      };
    }

    if (accountType === 'Admin' && !isAdminRoleId(roleValue)) {
      throw new Error(UNAUTHORIZED_ADMIN_LOGIN_MESSAGE);
    }

    return {
      role: toInternalRole(accountType),
      userType: accountType,
      roleTemplateId: accountType === 'Admin' ? undefined : roleValue || undefined,
      legacyRoleId: roleValue || undefined,
    };
  }

  const legacyRole = normalizeLegacyApiRole(roleValue);

  if (legacyRole) {
    return {
      role: legacyRole,
      userType: legacyRole === 'Customer' ? 'Business' : legacyRole,
      legacyRoleId: roleValue || undefined,
    };
  }

  if (roleValue) {
    return {
      role: null,
      legacyRoleId: roleValue,
    };
  }

  const inferredRole = inferApiRoleFromRecord(userRecord)
    || inferApiRoleFromRecord(tokenUserRecord)
    || inferApiRoleFromRecord(dataRecord)
    || inferApiRoleFromRecord(tokenPayload);

  return {
    role: inferredRole,
    userType: inferredRole === 'Customer' ? 'Business' : inferredRole || undefined,
  };
};

const extractResponseUserRecord = (body: unknown): UnknownRecord | null => {
  return extractFirstRecordWithKeys(
    body,
    [
      'id',
      'user_id',
      'name',
      'full_name',
      'fullname',
      'email',
      'email_id',
      'user_email',
      'role',
      'user_role',
      'user_type',
      'business_id',
      'workspace_id',
    ],
  );
};

export const extractAccessToken = (body: LoginApiResponseBody | null) => {
  const queue: unknown[] = [body];

  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    const token = readStringValue(current, apiTokenKeys);
    if (token) {
      return token;
    }

    Object.values(current).forEach((value) => {
      if (Array.isArray(value) || isRecord(value)) {
        queue.push(value);
      }
    });
  }

  return null;
};

export const mapLoginResponseToSessionUser = (
  email: string,
  responseBody: LoginApiResponseBody | null,
  resolveKnownUser?: (email: string, role: UserRole | null, businessId?: string) => SessionUserCandidate | null,
): SessionUserCandidate | null => {
  const normalizedEmail = normalizeEmailAddress(email);
  const accessToken = extractAccessToken(responseBody);
  const tokenPayload = parseAccessTokenPayload(accessToken);
  const tokenUserRecord = extractResponseUserRecord(tokenPayload);
  const userRecord = extractResponseUserRecord(responseBody);
  const dataRecord = isRecord(responseBody?.data) ? responseBody.data : null;
  const responseCounterRecord = readRecordValue(userRecord, ['counter', 'department']);
  const dataCounterRecord = readRecordValue(dataRecord, ['counter', 'department']);
  const tokenCounterRecord = readRecordValue(tokenUserRecord, ['counter', 'department'])
    || readRecordValue(tokenPayload, ['counter', 'department']);
  const resolvedEmail = normalizeEmailAddress(
    readStringValue(userRecord, apiEmailKeys)
      || readStringValue(tokenUserRecord, apiEmailKeys)
      || readStringValue(dataRecord, apiEmailKeys)
      || readStringValue(tokenPayload, apiEmailKeys)
      || normalizedEmail,
  );
  const loginIdentity = resolveLoginIdentity(responseBody, userRecord, tokenPayload, tokenUserRecord);
  const resolvedRole = loginIdentity.role;
  const resolvedUserId = readStringValue(userRecord, apiIdKeys)
    || readStringValue(tokenUserRecord, apiIdKeys)
    || readStringValue(dataRecord, apiIdKeys)
    || readStringValue(tokenPayload, apiIdKeys)
    || resolvedEmail;
  const resolvedBusinessId = readStringValue(userRecord, apiBusinessIdKeys)
    || readStringValue(tokenUserRecord, apiBusinessIdKeys)
    || readStringValue(dataRecord, apiBusinessIdKeys)
    || readStringValue(tokenPayload, apiBusinessIdKeys)
    || (resolvedRole === 'Customer' ? resolvedUserId : undefined)
    || undefined;
  const resolvedDepartmentId = readStringValue(userRecord, apiDepartmentIdKeys)
    || readStringValue(tokenUserRecord, apiDepartmentIdKeys)
    || readStringValue(dataRecord, apiDepartmentIdKeys)
    || readStringValue(tokenPayload, apiDepartmentIdKeys)
    || readStringValue(responseCounterRecord, ['id', 'department_id', 'counter_id'])
    || readStringValue(dataCounterRecord, ['id', 'department_id', 'counter_id'])
    || readStringValue(tokenCounterRecord, ['id', 'department_id', 'counter_id'])
    || undefined;
  const resolvedCounterId = readStringValue(userRecord, apiCounterIdKeys)
    || readStringValue(tokenUserRecord, apiCounterIdKeys)
    || readStringValue(dataRecord, apiCounterIdKeys)
    || readStringValue(tokenPayload, apiCounterIdKeys)
    || readStringValue(responseCounterRecord, ['id', 'counter_id', 'department_id'])
    || readStringValue(dataCounterRecord, ['id', 'counter_id', 'department_id'])
    || readStringValue(tokenCounterRecord, ['id', 'counter_id', 'department_id'])
    || resolvedDepartmentId;
  const resolvedCounterName = readStringValue(responseCounterRecord, ['name', 'counter_name', 'department_name'])
    || readStringValue(dataCounterRecord, ['name', 'counter_name', 'department_name'])
    || readStringValue(tokenCounterRecord, ['name', 'counter_name', 'department_name'])
    || readStringValue(userRecord, apiCounterNameKeys)
    || readStringValue(tokenUserRecord, apiCounterNameKeys)
    || readStringValue(dataRecord, apiCounterNameKeys)
    || readStringValue(tokenPayload, apiCounterNameKeys)
    || undefined;
  const resolvedPermissions = readPermissionsFromSources(
    userRecord,
    tokenUserRecord,
    dataRecord,
    tokenPayload,
    responseBody as UnknownRecord | null,
  );
  const matchedKnownUser = resolveKnownUser?.(resolvedEmail, resolvedRole, resolvedBusinessId);

  if (matchedKnownUser) {
    return {
      ...matchedKnownUser,
      userType: loginIdentity.userType,
      roleTemplateId: loginIdentity.roleTemplateId,
      legacyRoleId: loginIdentity.legacyRoleId,
      departmentId: resolvedDepartmentId,
      counterId: resolvedCounterId,
      counterName: resolvedCounterName,
      permissions: resolvedPermissions || matchedKnownUser.permissions,
    };
  }

  if (!userRecord && !dataRecord && !tokenPayload && !tokenUserRecord) {
    return null;
  }

  if (!resolvedRole) {
    return null;
  }

  if (resolvedRole !== 'Admin' && !resolvedBusinessId) {
    return null;
  }

  return {
    id: resolvedUserId,
    name: readStringValue(userRecord, apiNameKeys)
      || readStringValue(tokenUserRecord, apiNameKeys)
      || readStringValue(dataRecord, apiNameKeys)
      || readStringValue(tokenPayload, apiNameKeys)
      || resolvedEmail,
    email: resolvedEmail,
    role: resolvedRole,
    userType: loginIdentity.userType,
    roleTemplateId: loginIdentity.roleTemplateId,
    legacyRoleId: loginIdentity.legacyRoleId,
    businessId: resolvedBusinessId,
    departmentId: resolvedDepartmentId,
    counterId: resolvedCounterId,
    counterName: resolvedCounterName,
    permissions: resolvedPermissions,
  };
};

