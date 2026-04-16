import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getAvailableUsersFromState } from '../lib/auth-session';
import { createCustomerPermissions } from '../lib/platform-structure';
import { createBusinessSubscription } from '../lib/subscription';
import { createBusinessWorkspaceFromPermissions, type AppState } from '../lib/store';

const businessPermissions = createCustomerPermissions([
  'customers.list',
  'services.access',
]);

const buildState = (): AppState => {
  const activeWorkspace = createBusinessWorkspaceFromPermissions(businessPermissions);
  activeWorkspace.employees = [
    {
      id: 'employee-1',
      name: 'Aarav Patel',
      phone: '9876501234',
      email: 'aarav@enest.com',
      password: 'aarav123',
      permissions: businessPermissions,
      status: 'Active',
      joinedDate: '2024-01-09',
    },
  ];

  const inactiveWorkspace = createBusinessWorkspaceFromPermissions(businessPermissions);
  inactiveWorkspace.employees = [
    {
      id: 'employee-2',
      name: 'Meera Nair',
      phone: '9876505678',
      email: 'meera@enest.com',
      password: 'meera123',
      permissions: businessPermissions,
      status: 'Active',
      joinedDate: '2024-01-12',
    },
  ];

  return {
    businesses: [
      {
        id: 'business-1',
        name: 'Active Business',
        phone: '1234567890',
        email: 'business@enest.com',
        password: 'business123',
        status: 'Active',
        joinedDate: '2024-01-10',
        permissions: businessPermissions,
      },
      {
        id: 'business-2',
        name: 'Inactive Business',
        phone: '0987654321',
        email: 'inactive@enest.com',
        password: 'inactive123',
        status: 'Inactive',
        joinedDate: '2024-01-12',
        permissions: businessPermissions,
      },
    ],
    businessWorkspacesById: {
      'business-1': activeWorkspace,
      'business-2': inactiveWorkspace,
    },
    adminWorkspace: {
      notifications: [],
      historyEvents: [],
      reports: [],
      additionOptions: [],
    },
  };
};

describe('auth session user discovery', () => {
  test('builds Admin, active Business, and active-business Employee logins from state', () => {
    const users = getAvailableUsersFromState(buildState());

    assert.deepEqual(
      users.map((user) => ({ role: user.role, email: user.email, businessId: user.businessId })),
      [
        { role: 'Admin', email: 'admin@enest.com', businessId: undefined },
        { role: 'Customer', email: 'business@enest.com', businessId: 'business-1' },
        { role: 'Employee', email: 'aarav@enest.com', businessId: 'business-1' },
      ]
    );
  });

  test('deduplicates duplicate employee emails across businesses to avoid ambiguous logins', () => {
    const state = buildState();
    state.businesses[1].status = 'Active';
    state.businessWorkspacesById['business-2'].employees = [
      {
        id: 'employee-3',
        name: 'Duplicate User',
        phone: '9999999999',
        email: 'aarav@enest.com',
        password: 'duplicate123',
        permissions: businessPermissions,
        status: 'Active',
        joinedDate: '2024-01-13',
      },
    ];

    const users = getAvailableUsersFromState(state);
    const employeeUsers = users.filter((user) => user.role === 'Employee');

    assert.equal(employeeUsers.length, 1);
    assert.equal(employeeUsers[0]?.email, 'aarav@enest.com');
  });

  test('keeps the business owner login available for expired plans while blocking employee logins', () => {
    const state = buildState();
    state.businesses[0].subscription = createBusinessSubscription('month-1', '2024-01-01');

    const users = getAvailableUsersFromState(state);

    assert(users.some((user) => user.role === 'Customer' && user.businessId === 'business-1'));
    assert(!users.some((user) => user.role === 'Employee' && user.businessId === 'business-1'));
  });
});
