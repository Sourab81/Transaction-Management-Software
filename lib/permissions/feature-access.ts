import { hasAnyEnabledPermission, hasEnabledPermissionPrefix, isPermissionEnabled } from './checks';
import type { BusinessFeatureAction, CustomerPermissions } from './types';

export const canUseBusinessFeature = (
  permissions: CustomerPermissions | null | undefined,
  moduleId: string,
  action: BusinessFeatureAction,
) => {
  switch (moduleId) {
    case 'customers':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [
          'customers_add',
          'customers_list',
          'customers_payment_list',
          'customers_outstanding',
        ]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'customers_add');
      return isPermissionEnabled(permissions, 'customers_list');
    case 'employee':
      if (action === 'view') {
        return hasAnyEnabledPermission(permissions, [
          'employee_add',
          'employee_list',
          'employee_salary',
          'employee_outstanding',
        ]);
      }
      if (action === 'add') return isPermissionEnabled(permissions, 'employee_add');
      return isPermissionEnabled(permissions, 'employee_list');
    case 'services':
      return isPermissionEnabled(permissions, 'services_access');
    case 'accounts':
      if (action === 'view') return true;
      return isPermissionEnabled(permissions, 'master_account_manage');
    case 'departments':
      if (action === 'view') return true;
      return isPermissionEnabled(permissions, 'master_department_manage');
    case 'reports':
      return hasEnabledPermissionPrefix(permissions, 'reports_');
    case 'expense':
      return isPermissionEnabled(permissions, 'expense_access');
    case 'transactions':
      return isPermissionEnabled(permissions, 'services_access');
    default:
      return false;
  }
};
