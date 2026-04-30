import { hasAnyEnabledPermission, hasEnabledPermissionPrefix, isPermissionEnabled } from './checks';
import { getModulePermissionKeys } from './module-permissions';
import type { BusinessFeatureAction, CustomerPermissions } from './types';

export const canUseBusinessFeature = (
  permissions: CustomerPermissions | null | undefined,
  moduleId: string,
  action: BusinessFeatureAction,
) => {
  const modulePermissionKeys = getModulePermissionKeys(moduleId) ?? [];

  switch (moduleId) {
    case 'customers':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'customers_add');
      return isPermissionEnabled(permissions, 'customers_list');
    case 'employee':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'employee_add');
      return isPermissionEnabled(permissions, 'employee_list');
    case 'services':
      return isPermissionEnabled(permissions, 'services_access');
    case 'accounts':
      if (action === 'view') return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      return isPermissionEnabled(permissions, 'master_account_manage');
    case 'departments':
      if (action === 'view') return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      return isPermissionEnabled(permissions, 'master_department_manage');
    case 'reports':
      return hasAnyEnabledPermission(permissions, [...modulePermissionKeys])
        || hasEnabledPermissionPrefix(permissions, 'reports_');
    case 'expense':
      return isPermissionEnabled(permissions, 'expense_access');
    case 'transactions':
      return isPermissionEnabled(permissions, 'services_access');
    case 'reminder':
      return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
    default:
      return false;
  }
};
