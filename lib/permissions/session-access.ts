import { canUseBusinessFeature } from './feature-access';
import { canAccessModule, userDashboardModules } from './modules';
import type { CustomerPermissions, SessionAccessContext } from './types';

export const adminAccessibleModules = new Set(['dashboard', 'customers', 'reminder', 'history', 'reports', 'role', 'profile', 'additions']);
export const permissionBackedModules = new Set(['customers', 'employee', 'services', 'accounts', 'departments', 'reports', 'expense', 'transactions']);

const businessHasModulePermission = (permissions: CustomerPermissions | null | undefined, moduleId: string) => {
  switch (moduleId) {
    case 'customers':
      return canUseBusinessFeature(permissions, 'customers', 'view');
    case 'employee':
      return canUseBusinessFeature(permissions, 'employee', 'view');
    case 'services':
      return canUseBusinessFeature(permissions, 'services', 'view');
    case 'accounts':
      return canUseBusinessFeature(permissions, 'accounts', 'view');
    case 'departments':
      return canUseBusinessFeature(permissions, 'departments', 'view');
    case 'reports':
      return canUseBusinessFeature(permissions, 'reports', 'view');
    case 'expense':
      return canUseBusinessFeature(permissions, 'expense', 'view');
    case 'transactions':
      return canUseBusinessFeature(permissions, 'transactions', 'view');
    default:
      return false;
  }
};

export const getBusinessEnabledModules = (permissions: CustomerPermissions | null | undefined) => {
  const enabledModules = new Set<string>(['dashboard']);

  permissionBackedModules.forEach((moduleId) => {
    if (businessHasModulePermission(permissions, moduleId)) {
      enabledModules.add(moduleId);
    }
  });

  return enabledModules;
};

export const canAccessModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  if (context.role === 'Admin') {
    return adminAccessibleModules.has(moduleId);
  }

  if (!canAccessModule(context.role, moduleId)) {
    return false;
  }

  if (!context.businessId) {
    return false;
  }

  if (moduleId === 'profile') {
    return true;
  }

  if (context.role === 'Customer') {
    return getBusinessEnabledModules(context.permissions).has(moduleId);
  }

  if (permissionBackedModules.has(moduleId)) {
    return getBusinessEnabledModules(context.permissions).has(moduleId);
  }

  return true;
};

export const getSidebarModulesForSession = (context: SessionAccessContext) => {
  return userDashboardModules.filter((module) => {
    const visibleToRole = (module.sidebarRoles ?? module.allowedRoles).includes(context.role);
    return visibleToRole && canAccessModuleForSession(context, module.id);
  });
};
