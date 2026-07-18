import { hasAnyEnabledPermission } from './checks';
import { canUseBusinessFeature } from './feature-access';
import { canAccessModuleForSession } from './session-access';
import type { BusinessFeatureAction, SessionAccessContext } from './types';

const employeeManageableModules = new Set(['services', 'customers', 'accounts', 'colors', 'customer-categories', 'transactions', 'history', 'reports']);
const businessManageableModules = new Set(['customers', 'employee', 'departments', 'services', 'accounts', 'colors', 'customer-categories', 'expense', 'reports', 'transactions', 'permissions']);
const businessDeletableModules = new Set(['customers', 'employee', 'departments', 'services', 'accounts', 'colors', 'customer-categories', 'expense', 'reports']);
const adminManageableModules = new Set(['customers', 'reports', 'role', 'additions', 'permissions']);
const adminDeletableModules = new Set(['customers', 'history', 'reports', 'role', 'additions', 'permissions']);

const canViewBusinessRecords = (context: SessionAccessContext, moduleId: string) => {
  switch (moduleId) {
    case 'customers':
      return hasAnyEnabledPermission(context.permissions, [
        'customers_list',
        'customers_payment_list',
        'customers_outstanding',
      ]);
    case 'employee':
      return hasAnyEnabledPermission(context.permissions, [
        'employees_list',
        'employees_salary',
      ]);
    case 'services':
    case 'accounts':
    case 'colors':
    case 'customer-categories':
    case 'departments':
    case 'reports':
    case 'expense':
      return canUseBusinessFeature(context.permissions, moduleId, 'view');
    default:
      return false;
  }
};

export const canViewModuleRecordsForSession = (context: SessionAccessContext, moduleId: string) => {
  if (!canAccessModuleForSession(context, moduleId)) return false;
  if (context.role === 'Admin') return true;
  if (context.role === 'Customer' || context.role === 'Employee') {
    return canViewBusinessRecords(context, moduleId);
  }

  return false;
};

export const canPerformModuleActionForSession = (
  context: SessionAccessContext,
  moduleId: string,
  action: Exclude<BusinessFeatureAction, 'view'>,
) => {
  if (!canAccessModuleForSession(context, moduleId)) return false;

  if (context.role === 'Admin') {
    return action === 'delete'
      ? adminDeletableModules.has(moduleId)
      : adminManageableModules.has(moduleId);
  }

    if (context.role === 'Customer') {
    if (!businessManageableModules.has(moduleId)) return false;
    if (action === 'delete' && !businessDeletableModules.has(moduleId)) return false;
    return canUseBusinessFeature(context.permissions, moduleId, action);
  }

  if (context.role === 'Employee') {
    if (action === 'delete') return false;
    if (!employeeManageableModules.has(moduleId)) return false;

    if (businessManageableModules.has(moduleId)) {
      return canUseBusinessFeature(context.permissions, moduleId, action);
    }

    return true;
  }

  return false;
};

export const canManageModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  return (
    canPerformModuleActionForSession(context, moduleId, 'add') ||
    canPerformModuleActionForSession(context, moduleId, 'edit')
  );
};

export const canDeleteModuleForSession = (context: SessionAccessContext, moduleId: string) => {
  return canPerformModuleActionForSession(context, moduleId, 'delete');
};

export const canDeleteRecordsForRole = (role: SessionAccessContext['role']) => role === 'Admin';
