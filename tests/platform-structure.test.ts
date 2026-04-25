import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getModuleDisplayById } from '../lib/platform-structure';

describe('platform structure module display', () => {
  test('renames the Admin customer module to Businesses', () => {
    assert.equal(getModuleDisplayById('customers', 'Admin')?.sidebarLabel, 'Businesses');
    assert.equal(getModuleDisplayById('customers', 'Admin')?.label, 'Businesses');
  });

  test('keeps the customer module label for business users', () => {
    assert.equal(getModuleDisplayById('customers', 'Customer')?.sidebarLabel, 'Customers');
  });
});
