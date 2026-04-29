import { customerPermissionIdAliases, resolveCanonicalPermissionId } from './aliases';
import { customerPermissionToggleItems } from './catalog';
import type { CustomerPermissions, PermissionFlag } from './types';

export const buildDefaultCustomerPermissions = (): CustomerPermissions =>
  Object.fromEntries(customerPermissionToggleItems.map((item) => [item.id, 0])) as CustomerPermissions;

export const toPermissionFlag = (value: unknown): PermissionFlag => {
  if (value === 1 || value === true) {
    return 1;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'active', 'enabled'].includes(normalizedValue)) {
      return 1;
    }
  }

  return 0;
};

export const normalizeCustomerPermissions = (permissions?: Record<string, unknown> | null): CustomerPermissions => {
  const nextPermissions = buildDefaultCustomerPermissions();
  if (!permissions) return nextPermissions;

  const permissionsByLowercaseKey = Object.entries(permissions).reduce<Record<string, unknown>>((indexedPermissions, [key, value]) => {
    indexedPermissions[key.toLowerCase()] = value;
    return indexedPermissions;
  }, {});

  Object.entries(customerPermissionIdAliases).forEach(([canonicalId, aliases]) => {
    const resolvedValue = aliases.find((alias) =>
      toPermissionFlag(permissions[alias]) === 1 ||
      toPermissionFlag(permissionsByLowercaseKey[alias.toLowerCase()]) === 1
    );

    if (resolvedValue) {
      nextPermissions[canonicalId] = 1;
    }
  });

  return nextPermissions;
};

export const createCustomerPermissions = (enabledPermissionIds: string[] = []): CustomerPermissions => {
  const rawPermissions = Object.fromEntries(enabledPermissionIds.map((permissionId) => [permissionId, 1])) as CustomerPermissions;
  const nextPermissions = normalizeCustomerPermissions(rawPermissions);

  enabledPermissionIds.forEach((permissionId) => {
    const canonicalPermissionId = resolveCanonicalPermissionId(permissionId);
    if (canonicalPermissionId in nextPermissions) {
      nextPermissions[canonicalPermissionId] = 1;
    }
  });

  return nextPermissions;
};

export const intersectCustomerPermissions = (
  basePermissions: CustomerPermissions | null | undefined,
  scopedPermissions: CustomerPermissions | null | undefined,
): CustomerPermissions => {
  const normalizedBasePermissions = normalizeCustomerPermissions(basePermissions);
  const normalizedScopedPermissions = normalizeCustomerPermissions(scopedPermissions);

  return Object.fromEntries(
    Object.keys(normalizedBasePermissions).map((permissionId) => [
      permissionId,
      normalizedBasePermissions[permissionId] === 1 && normalizedScopedPermissions[permissionId] === 1 ? 1 : 0,
    ]),
  ) as CustomerPermissions;
};
