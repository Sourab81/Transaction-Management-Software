import { customerPermissionIdAliases, resolveCanonicalPermissionId } from './aliases';
import { toPermissionFlag } from './normalize';
import type { CustomerPermissions } from './types';

export const isPermissionEnabled = (
  permissions: CustomerPermissions | null | undefined,
  permissionId: string,
) => {
  const canonicalPermissionId = resolveCanonicalPermissionId(permissionId);
  const aliases = customerPermissionIdAliases[canonicalPermissionId] ?? [permissionId];

  return aliases.some((alias) => toPermissionFlag(permissions?.[alias]) === 1)
    || toPermissionFlag(permissions?.[canonicalPermissionId]) === 1;
};

export const hasAnyEnabledPermission = (
  permissions: CustomerPermissions | null | undefined,
  permissionIds: string[],
) => permissionIds.some((permissionId) => isPermissionEnabled(permissions, permissionId));

export const hasEnabledPermissionPrefix = (
  permissions: CustomerPermissions | null | undefined,
  prefix: string,
) => {
  const legacyPrefix = prefix.includes('_') ? prefix.replace('_', '.') : prefix;
  return Object.entries(permissions ?? {}).some(
    ([permissionId, enabled]) =>
      enabled === 1 && (permissionId.startsWith(prefix) || permissionId.startsWith(legacyPrefix)),
  );
};
