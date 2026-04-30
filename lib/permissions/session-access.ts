import { userDashboardModules } from './modules';
import {
  canViewModuleByPermissions,
  getCanonicalPermissionModuleId,
  hasAnyModulePermission,
  moduleRequiresPermissions,
  safeBaseModules,
} from './module-permissions';
import type { CustomerPermissions, SessionAccessContext } from './types';

export const adminAccessibleModules = new Set(['dashboard', 'customers', 'reminder', 'history', 'reports', 'role', 'profile', 'additions']);
export const permissionBackedModules = new Set(['customers', 'employee', 'services', 'accounts', 'departments', 'reports', 'expense', 'transactions', 'reminder']);

const businessHasModulePermission = (permissions: CustomerPermissions | null | undefined, moduleId: string) => {
  return hasAnyModulePermission(permissions, moduleId);
};

export const getBusinessEnabledModules = (permissions: CustomerPermissions | null | undefined) => {
  const enabledModules = new Set<string>(['dashboard', 'profile']);

  permissionBackedModules.forEach((moduleId) => {
    if (businessHasModulePermission(permissions, moduleId)) {
      enabledModules.add(moduleId);
    }
  });

  return enabledModules;
};

export const canAccessModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  const canonicalModuleId = getCanonicalPermissionModuleId(moduleId);

  if (!userDashboardModules.some((module) => module.id === canonicalModuleId)) {
    return false;
  }

  if (context.role === 'Admin') {
    return adminAccessibleModules.has(moduleId);
  }

  if (!context.businessId) {
    return false;
  }

  if (!moduleRequiresPermissions(canonicalModuleId)) {
    return safeBaseModules.has(canonicalModuleId);
  }

  return canViewModuleByPermissions(context, canonicalModuleId);
};

export const getPermissionBasedSidebarModules = (context: SessionAccessContext) => {
  return userDashboardModules.filter((module) => canViewModuleByPermissions(context, module.id));
};

export const getSidebarModulesForSession = (context: SessionAccessContext) => {
  if (context.role === 'Admin') {
    return userDashboardModules.filter((module) => {
      const visibleToRole = (module.sidebarRoles ?? module.allowedRoles).includes(context.role);
      return visibleToRole && canAccessModuleForSession(context, module.id);
    });
  }

  return getPermissionBasedSidebarModules(context);
};
