import {
  createCustomerPermissions,
  normalizeCustomerPermissions,
  type CustomerPermissions,
} from '../platform-structure';
import {
  isRecord,
  readArrayValue,
  readBooleanLikeValue,
  readStringValue,
  readUnknownValue,
  type UnknownRecord,
} from './legacy-record';

const permissionValueKeys = [
  'permissions',
  'permission',
  'user_permissions',
  'permission_map',
  'permissionMap',
  'module_permissions',
  'modulePermissions',
  'access',
];

const normalizePermissionIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<string[]>((permissionIds, entry) => {
    if (typeof entry === 'string' && entry.trim()) {
      permissionIds.push(entry.trim());
      return permissionIds;
    }

    if (!isRecord(entry)) {
      return permissionIds;
    }

    const permissionId = readStringValue(entry, ['id', 'name', 'permission_id', 'permission']);
    if (permissionId) {
      permissionIds.push(permissionId);
    }

    return permissionIds;
  }, []);
};

export const mapPermissionValue = (value: unknown): CustomerPermissions | undefined => {
  const permissionIds = normalizePermissionIdList(value);
  if (permissionIds.length > 0) {
    return createCustomerPermissions(permissionIds);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const booleanLikeEntries = Object.entries(value).filter(([, entryValue]) =>
    readBooleanLikeValue({ value: entryValue }, ['value']) === true,
  );

  if (booleanLikeEntries.length > 0) {
    return normalizeCustomerPermissions(
      Object.fromEntries(booleanLikeEntries.map(([key]) => [key, 1])),
    );
  }

  return normalizeCustomerPermissions(value as Partial<CustomerPermissions>);
};

export const readPermissionsFromSources = (...sources: Array<UnknownRecord | null>) => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const directArray = readArrayValue(source, permissionValueKeys);
    if (directArray) {
      const mappedPermissions = mapPermissionValue(directArray);
      if (mappedPermissions) {
        return mappedPermissions;
      }
    }

    const directValue = readUnknownValue(source, permissionValueKeys);
    const mappedPermissions = mapPermissionValue(directValue);
    if (mappedPermissions) {
      return mappedPermissions;
    }
  }

  return undefined;
};
