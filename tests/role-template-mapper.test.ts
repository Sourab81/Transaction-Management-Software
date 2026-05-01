import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildRoleTemplatePrivilegesPayload,
  isSelectableRoleTemplate,
  mapRoleTemplatesResponse,
} from '../lib/mappers/role-template-mapper';

describe('role template mapper', () => {
  test('maps /getRoles privileges while preserving backend privilege keys', () => {
    const roles = mapRoleTemplatesResponse({
      status: 200,
      data: [
        {
          id: 2,
          role_name: 'Business',
          status: 1,
          privileges: {
            Master_account_manage: 1,
            Master_department_manage: 0,
            Customers_add: 1,
            Services_access: 1,
            accounts_cash_deposit: 0,
            Accounts_department_transfer: 1,
            reports_day_report_account_and_counter_details: 0,
          },
        },
      ],
    });

    assert.equal(roles.length, 1);
    assert.equal(roles[0].privileges.master_account_manage, 1);
    assert.equal(roles[0].privileges.master_department_manage, 0);
    assert.equal(roles[0].backendPrivileges.Master_account_manage, 1);
    assert.equal(roles[0].backendPrivileges.Accounts_department_transfer, 1);
  });

  test('selectable roles exclude super admin, id 1, and inactive status values', () => {
    assert.equal(isSelectableRoleTemplate({ id: '1', roleName: 'Business', status: '1' }), false);
    assert.equal(isSelectableRoleTemplate({ id: '2', roleName: 'Super Admin', status: '1' }), false);
    assert.equal(isSelectableRoleTemplate({ id: '3', roleName: 'Inactive', status: '0' }), false);
    assert.equal(isSelectableRoleTemplate({ id: '4', roleName: 'Business', status: '1' }), true);
    assert.equal(isSelectableRoleTemplate({ id: '5', roleName: 'Legacy Business' }), true);
    assert.equal(isSelectableRoleTemplate({ id: '6', roleName: 'Cash Counter', status: 'Active' }), true);
    assert.equal(isSelectableRoleTemplate({ id: '7', roleName: 'Disabled Role', status: 'disabled' }), false);
  });

  test('builds create-user privileges from edited permissions using selected role key casing', () => {
    const roles = mapRoleTemplatesResponse({
      data: [
        {
          id: 2,
          role_name: 'tt',
          status: 1,
          privileges: {
            Master_account_manage: 1,
            Master_department_manage: 0,
            Customers_add: 0,
            Services_access: 0,
            accounts_cash_deposit: 0,
            Accounts_department_transfer: 0,
            reports_day_report_account_and_counter_details: 0,
          },
        },
      ],
    });
    const selectedRole = roles[0];
    const editedPermissions = {
      ...selectedRole.privileges,
      master_department_manage: 1 as const,
    };
    const payload = buildRoleTemplatePrivilegesPayload(
      editedPermissions,
      selectedRole.backendPrivileges,
    );

    assert.equal(payload.Master_account_manage, 1);
    assert.equal(payload.Master_department_manage, 1);
    assert.equal(payload.Customers_add, 0);
    assert.equal(payload.Services_access, 0);
    assert.equal(payload.accounts_cash_deposit, 0);
    assert.equal(payload.Accounts_department_transfer, 0);
    assert.equal(payload.reports_day_report_account_and_counter_details, 0);
  });
});
