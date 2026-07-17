import { canWrite, hasAnyEnabledPermission, hasEnabledPermissionPrefix, isPermissionEnabled } from './checks';
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
      if (action === 'add') return canWrite(permissions, 'customers_add');
      if (action === 'edit' || action === 'delete') return canWrite(permissions, 'customers_list');
      return false;
    case 'employee':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      }
      if (action === 'add') return canWrite(permissions, 'employees_add');
      if (action === 'edit' || action === 'delete') return canWrite(permissions, 'employees_list');
      return false;
    case 'services':
      if (action === 'view') return isPermissionEnabled(permissions, 'master_inventory');
      return canWrite(permissions, 'master_inventory');
    case 'accounts':
      if (action === 'view') return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      return canWrite(permissions, 'master_account');
    case 'colors':
      if (action === 'view') return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      return canWrite(permissions, 'master_color');
    case 'customer-categories':
      if (action === 'view') return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      return canWrite(permissions, 'master_customer_category');
    case 'departments':
      if (action === 'view') return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      return canWrite(permissions, 'master_counter');
    case 'reports':
      return hasAnyEnabledPermission(permissions, [...modulePermissionKeys])
        || hasEnabledPermissionPrefix(permissions, 'reports_');
    case 'expense':
      if (action === 'view') return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
      if (action === 'add') return canWrite(permissions, 'expense_add');
      if (action === 'edit' || action === 'delete') return canWrite(permissions, 'expense_list');
      return false;
    case 'transactions':
      if (action === 'view') return isPermissionEnabled(permissions, 'transactions_list');
      if (action === 'add') return canWrite(permissions, 'transactions_add');
      if (action === 'edit' || action === 'delete') return canWrite(permissions, 'transactions_list');
      return false;
    case 'reminder':
      return hasAnyEnabledPermission(permissions, [...modulePermissionKeys]);
    default:
      return false;
  }
};
