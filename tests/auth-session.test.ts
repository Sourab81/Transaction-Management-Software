import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getAvailableUsersFromState, getStoredAccessToken, loginWithDummyCredentials } from '../lib/auth-session';
import { createCustomerPermissions } from '../lib/platform-structure';
import { createBusinessSubscription } from '../lib/subscription';
import { createBusinessWorkspaceFromPermissions, type AppState } from '../lib/store';

const businessPermissions = createCustomerPermissions([
  'customers_list',
  'services_access',
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

  test('supports the seeded admin credentials through the local dummy login path', () => {
    const user = loginWithDummyCredentials('Admin', 'admin@enest.com', 'admin123');

    assert.deepEqual(user, {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@enest.com',
      role: 'Admin',
      businessId: undefined,
      permissions: undefined,
    });
  });

  test('keeps the seeded admin fallback available even when a custom admin profile is stored', () => {
    const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
    const originalLocalStorage = (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: localStorageMock },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });

    localStorageMock.setItem('enest-admin-profile', JSON.stringify({
      id: 'admin-1',
      name: 'Custom Admin',
      email: 'custom-admin@enest.com',
      password: 'custom-admin-password',
    }));

    try {
      const user = loginWithDummyCredentials('Admin', 'admin@enest.com', 'admin123');

      assert.deepEqual(user, {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@enest.com',
        role: 'Admin',
        businessId: undefined,
        permissions: undefined,
      });
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });

  test('clears any stored backend token when the temporary admin login succeeds', () => {
    const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
    const originalLocalStorage = (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: localStorageMock },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });

    localStorageMock.setItem('enest-auth-token', 'stale-access-token');

    try {
      const user = loginWithDummyCredentials('Admin', 'admin@enest.com', 'admin123');

      assert.equal(user?.role, 'Admin');
      assert.equal(getStoredAccessToken(), null);
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });
});
