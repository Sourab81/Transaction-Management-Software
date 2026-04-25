import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createCustomerPermissions } from '../lib/platform-structure';
import { migrateLegacyState, type LegacyAppState } from '../lib/store';

describe('store migration', () => {
  test('preserves legacy business directory records and rebuilds empty tenant workspaces from permissions', () => {
    const legacyState: LegacyAppState = {
      customers: [
        {
          id: 'legacy-business-1',
          name: 'Legacy Business',
          phone: '1234567890',
          email: 'legacy@example.com',
          status: 'Active',
          joinedDate: '2024-01-10',
          permissions: createCustomerPermissions([
            'customer.customer_list',
            'masters.accounts',
          ]),
        },
      ],
      notifications: [
        {
          id: 'notification-1',
          type: 'info',
          message: 'Legacy admin notification',
          timestamp: 'Earlier',
        },
      ],
      historyEvents: [
        {
          id: 'history-1',
          title: 'Legacy history',
          module: 'Customers',
          actor: 'Admin',
          status: 'Completed',
          date: '2024-01-15',
        },
      ],
      reports: [
        {
          id: 'report-1',
          name: 'Legacy report',
          type: 'Revenue',
          owner: 'Admin',
          status: 'Ready',
          date: '2024-01-15',
        },
      ],
      additionOptions: [
        {
          id: 'option-1',
          title: 'Legacy option',
          category: 'Reports',
          description: 'Migrated option',
          status: 'Enabled',
          date: '2024-01-15',
        },
      ],
    };

    const migratedState = migrateLegacyState(legacyState);
    const migratedBusiness = migratedState.businesses[0];
    const workspace = migratedState.businessWorkspacesById['legacy-business-1'];

    assert.equal(migratedBusiness?.name, 'Legacy Business');
    assert.equal(migratedBusiness?.email, 'legacy@example.com');
    assert.equal(migratedBusiness?.password, '');
    assert.equal(migratedBusiness?.status, 'Active');
    assert.equal(migratedBusiness?.subscription?.planId, 'trial-1-week');
    assert.equal(migratedBusiness?.subscription?.status, 'trial');
    assert.equal(workspace?.customers.length, 0);
    assert.equal(workspace?.employees.length, 0);
    assert.equal(workspace?.transactions.length, 0);
    assert.equal(workspace?.accounts.length, 0);
    assert.equal(workspace?.counters.length, 0);
    assert.equal(migratedState.adminWorkspace.notifications[0]?.message, 'Legacy admin notification');
    assert.equal(migratedState.adminWorkspace.reports[0]?.name, 'Legacy report');
    assert.equal(migratedState.adminWorkspace.additionOptions[0]?.title, 'Legacy option');
  });
});
