import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessModuleForSession,
  getPermissionBasedSidebarModules,
  getSidebarModulesForSession,
  createCustomerPermissions,
  hasAnyPermission,
  isPermissionEnabled,
  modulePermissionMap,
} from '../lib/platform-structure';

describe('permission based module access', () => {
  test('keeps a central permission map for workspace modules', () => {
    assert.deepEqual(modulePermissionMap.dashboard, []);
    assert.deepEqual(modulePermissionMap.profile, []);
    assert.ok(modulePermissionMap.customers.includes('customers_list'));
    assert.ok(modulePermissionMap.employees.includes('employees_list'));
  });

  test('supports permission values and aliases through shared helpers', () => {
    const permissions = createCustomerPermissions(['Customers_list']);

    assert.equal(isPermissionEnabled(1), true);
    assert.equal(isPermissionEnabled(0), false);
    assert.equal(hasAnyPermission(permissions, ['Customers_list']), true);
    assert.equal(hasAnyPermission(permissions, ['master_inventory']), false);
  });

  test('renders sidebar modules from permissions for business users', () => {
    const context = {
      role: 'Customer' as const,
      businessId: 'business-1',
      permissions: createCustomerPermissions(['Customers_list', 'Services_access']),
    };

    assert.deepEqual(
      getPermissionBasedSidebarModules(context).map((module) => module.id),
      ['dashboard', 'customers', 'services', 'profile'],
    );
  });

  test('blocks direct URL access when a required permission is missing', () => {
    const context = {
      role: 'Employee' as const,
      businessId: 'business-1',
      permissions: createCustomerPermissions(['Customers_list']),
    };

    assert.equal(canAccessModuleForSession(context, 'customers'), true);
    assert.equal(canAccessModuleForSession(context, 'services'), false);
    assert.equal(canAccessModuleForSession(context, 'accounts'), false);
  });

  test('denies cash counter employee module access when all employee permissions are disabled', () => {
    const cashCounterContext = {
      role: 'Customer' as const,
      businessId: 'business-1',
      permissions: createCustomerPermissions([
        'Master_account_manage',
        'Master_department_manage',
        'Customers_add',
        'Customers_list',
        'Customers_payment_list',
        'Customers_outstanding',
        'Services_access',
        'Expense_access',
      ]),
    };

    assert.equal(canAccessModuleForSession(cashCounterContext, 'employee'), false);
    assert.deepEqual(
      getPermissionBasedSidebarModules(cashCounterContext).map((module) => module.id),
      ['dashboard', 'customers', 'departments', 'services', 'accounts', 'profile', 'expense'],
    );
  });

  test('allows employee module only when at least one employee permission is enabled', () => {
    const addEmployeeOnlyContext = {
      role: 'Customer' as const,
      businessId: 'business-1',
      permissions: createCustomerPermissions(['Employee_add']),
    };

    assert.equal(canAccessModuleForSession(addEmployeeOnlyContext, 'employee'), true);
  });

  test('keeps admin module access on the existing admin rules', () => {
    const adminWithoutPermissions = { role: 'Admin' as const };
    const adminWithRestrictedPermissions = {
      role: 'Admin' as const,
      permissions: createCustomerPermissions(['Reports_bank_counter_report']),
    };

    assert.equal(canAccessModuleForSession(adminWithoutPermissions, 'customers'), true);
    assert.equal(canAccessModuleForSession(adminWithRestrictedPermissions, 'customers'), true);
    assert.equal(canAccessModuleForSession(adminWithRestrictedPermissions, 'role'), true);
    assert.equal(canAccessModuleForSession(adminWithRestrictedPermissions, 'additions'), true);
    assert.deepEqual(
      getSidebarModulesForSession(adminWithRestrictedPermissions).map((module) => module.id),
      ['dashboard', 'customers', 'reminder', 'reports', 'role', 'profile', 'permissions'],
    );
  });
});
