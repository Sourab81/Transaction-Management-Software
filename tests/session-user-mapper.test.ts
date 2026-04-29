import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createCustomerPermissions } from '../lib/platform-structure';
import { mapLoginResponseToSessionUser } from '../lib/mappers/session-user-mapper';

describe('session user mapper', () => {
  test('maps current backend business login payloads using numeric role codes', () => {
    const sessionUser = mapLoginResponseToSessionUser('business@example.test', {
      status: 200,
      message: 'User login successfully.',
      data: {
        id: 1,
        fullname: 'Business User',
        nickname: 'Business',
        gender: 'male',
        contact_no: 9999999999,
        email_id: 'business@example.test',
        username: 'business@example.test',
        user_type: 'Business',
        role: 2,
        token: 'test-token',
      },
    }, () => null);

    assert.deepEqual(sessionUser, {
      id: '1',
      name: 'Business User',
      email: 'business@example.test',
      role: 'Customer',
      businessId: '1',
      departmentId: undefined,
      counterId: undefined,
      counterName: undefined,
      permissions: undefined,
    });
  });

  test('maps mixed-case backend permission keys from the business login payload', () => {
    const sessionUser = mapLoginResponseToSessionUser('sagar@gmail.com', {
      status: 200,
      message: 'User login successfully.',
      data: {
        id: 1,
        fullname: 'Sagar Thakur',
        contact_no: 6265965711,
        email_id: 'sagar@gmail.com',
        username: 'sagar@gmail.com',
        user_type: 'Business',
        role: 2,
        token: 'test-token',
        permission: {
          Master_account_manage: 1,
          Master_department_manage: 1,
          Customers_add: 1,
          Customers_list: 1,
          Customers_payment_list: 1,
          Customers_outstanding: 1,
          Services_access: 1,
          accounts_cash_deposit: 1,
          Accounts_department_transfer: 1,
          Reports_bank_counter_report: 0,
          Employee_add: 1,
          Employee_list: 1,
          Employee_salary: 1,
          Employee_outstanding: 1,
          Expense_access: 1,
        },
      },
    }, () => null);

    assert.equal(sessionUser?.permissions?.master_account_manage, 1);
    assert.equal(sessionUser?.permissions?.master_department_manage, 1);
    assert.equal(sessionUser?.permissions?.customers_list, 1);
    assert.equal(sessionUser?.permissions?.services_access, 1);
    assert.equal(sessionUser?.permissions?.accounts_department_transfer, 1);
    assert.equal(sessionUser?.permissions?.employee_list, 1);
    assert.equal(sessionUser?.permissions?.expense_access, 1);
    assert.equal(sessionUser?.permissions?.reports_bank_counter_report, 0);
  });

  test('maps numeric admin and employee role codes', () => {
    const adminUser = mapLoginResponseToSessionUser('admin@enest.com', {
      data: {
        id: 10,
        fullname: 'Admin User',
        email_id: 'admin@enest.com',
        role: 1,
      },
    }, () => null);
    const employeeUser = mapLoginResponseToSessionUser('operator@enest.com', {
      data: {
        id: 20,
        fullname: 'Counter Operator',
        email_id: 'operator@enest.com',
        role: 3,
        business_id: 1,
      },
    }, () => null);

    assert.equal(adminUser?.role, 'Admin');
    assert.equal(adminUser?.businessId, undefined);
    assert.equal(employeeUser?.role, 'Employee');
    assert.equal(employeeUser?.businessId, '1');
  });

  test('maps legacy employee login payloads into a session user with normalized permissions', () => {
    const sessionUser = mapLoginResponseToSessionUser('aarav@enest.com', {
      data: {
        employee: {
          employee_id: 7,
          full_name: 'Aarav Patel',
          user_email: 'aarav@enest.com',
          user_role: 'employee',
          business_id: 'business-1',
          department: {
            department_id: 'department-1',
            department_name: 'Retail Counter',
          },
          permissions: ['customers_list', 'services_access'],
        },
      },
    }, () => null);

    assert.deepEqual(sessionUser, {
      id: '7',
      name: 'Aarav Patel',
      email: 'aarav@enest.com',
      role: 'Employee',
      businessId: 'business-1',
      departmentId: 'department-1',
      counterId: 'department-1',
      counterName: 'Retail Counter',
      permissions: createCustomerPermissions(['customers_list', 'services_access']),
    });
  });

  test('falls back to a known local user when the backend omits the role but the login is still uniquely identifiable', () => {
    const sessionUser = mapLoginResponseToSessionUser('owner@business.com', {
      data: {
        account: {
          user_email: 'owner@business.com',
          business_id: 'business-1',
        },
      },
    }, (email, role, businessId) => {
      if (email === 'owner@business.com' && role === 'Customer' && businessId === 'business-1') {
        return {
          id: 'business-1',
          name: 'Demo Business',
          email,
          role: 'Customer',
          businessId,
          permissions: createCustomerPermissions(['customers_list']),
        };
      }

      return null;
    });

    assert.equal(sessionUser?.role, 'Customer');
    assert.equal(sessionUser?.businessId, 'business-1');
    assert.equal(sessionUser?.email, 'owner@business.com');
    assert.equal(sessionUser?.permissions?.customers_list, 1);
  });
});
