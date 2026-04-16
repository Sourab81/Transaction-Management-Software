import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  canPerformModuleActionForSession,
  canDeleteModuleForSession,
  canDeleteRecordsForRole,
  canManageModuleForSession,
  canViewModuleRecordsForSession,
  getSearchMatches,
  getTransactionSummary,
  getVisibleCustomers,
  getVisibleServices,
  getVisibleTransactions,
} from '../lib/dashboard-controller';
import { canAccessModuleForSession, createCustomerPermissions } from '../lib/platform-structure';
import type { BusinessCustomer, Service, Transaction } from '../lib/store';

const services: Service[] = [
  {
    id: 'service-1',
    departmentId: 'department-1',
    departmentName: 'Retail Counter',
    name: 'Mobile Recharge',
    category: 'Telecom',
    price: 50,
    status: 'Active',
    description: 'Recharge phone numbers quickly',
  },
  {
    id: 'service-2',
    departmentId: 'department-1',
    departmentName: 'Retail Counter',
    name: 'Bill Payment',
    category: 'Utilities',
    price: 0,
    status: 'Inactive',
    description: 'Pay water and electricity bills',
  },
];

const customers: BusinessCustomer[] = [
  {
    id: 'customer-1',
    name: 'John Doe',
    phone: '1234567890',
    email: 'john@example.com',
    status: 'Active',
    joinedDate: '2024-01-10',
  },
  {
    id: 'customer-2',
    name: 'Jane Smith',
    phone: '0987654321',
    email: 'jane@example.com',
    status: 'Active',
    joinedDate: '2024-01-12',
  },
];

const transactions: Transaction[] = [
  {
    id: 'transaction-1',
    transactionNumber: 'TXN-20260101-100000-A001',
    customerId: 'customer-1',
    customerName: 'John Doe',
    customerPhone: '1234567890',
    serviceId: 'service-1',
    service: 'Mobile Recharge',
    servicePrice: 50,
    totalAmount: 50,
    paidAmount: 50,
    dueAmount: 0,
    paymentMode: 'cash',
    departmentId: 'department-1',
    departmentName: 'Retail Counter',
    accountId: 'account-1',
    accountLabel: 'Primary Account | Default Bank',
    handledById: 'business-1',
    handledByName: 'Owner User',
    handledByRole: 'Customer',
    note: '',
    status: 'completed',
    date: '2024-01-15',
    createdAt: '2024-01-15T09:00:00.000Z',
  },
  {
    id: 'transaction-2',
    transactionNumber: 'TXN-20260101-101500-A002',
    customerId: 'customer-2',
    customerName: 'Jane Smith',
    customerPhone: '0987654321',
    serviceId: 'service-2',
    service: 'Bill Payment',
    servicePrice: 100,
    totalAmount: 100,
    paidAmount: 40,
    dueAmount: 60,
    paymentMode: 'upi',
    departmentId: 'department-1',
    departmentName: 'Retail Counter',
    accountId: 'account-1',
    accountLabel: 'Primary Account | Default Bank',
    handledById: 'employee-1',
    handledByName: 'Aarav Patel',
    handledByRole: 'Employee',
    note: 'Part payment',
    status: 'pending',
    date: '2024-01-16',
    createdAt: '2024-01-16T10:15:00.000Z',
  },
  {
    id: 'transaction-3',
    transactionNumber: 'TXN-20260101-103000-A003',
    customerId: 'customer-1',
    customerName: 'John Doe',
    customerPhone: '1234567890',
    serviceId: 'service-3',
    service: 'Money Transfer',
    servicePrice: 75.5,
    totalAmount: 75.5,
    paidAmount: 0,
    dueAmount: 0,
    paymentMode: 'bank',
    departmentId: 'department-2',
    departmentName: 'Online Desk',
    accountId: 'account-2',
    accountLabel: 'Secondary Account | Default Bank',
    handledById: 'employee-2',
    handledByName: 'Meera Nair',
    handledByRole: 'Employee',
    note: 'Cancelled by customer',
    status: 'cancelled',
    date: '2024-01-17',
    createdAt: '2024-01-17T10:30:00.000Z',
  },
];

const businessPermissions = createCustomerPermissions([
  'customers.list',
  'services.access',
  'reports.bank_counter_report',
  'master.account_manage',
]);

const restrictedPermissions = createCustomerPermissions([]);
const addOnlyCustomerPermissions = createCustomerPermissions(['customers.add']);
const employeeCustomerOnlyPermissions = createCustomerPermissions(['customers.list']);

const adminContext = { role: 'Admin' as const };
const businessContext = { role: 'Customer' as const, businessId: 'business-1', permissions: businessPermissions };
const restrictedBusinessContext = { role: 'Customer' as const, businessId: 'business-2', permissions: restrictedPermissions };
const addOnlyBusinessContext = { role: 'Customer' as const, businessId: 'business-3', permissions: addOnlyCustomerPermissions };
const employeeContext = { role: 'Employee' as const, businessId: 'business-1', permissions: businessPermissions };
const restrictedEmployeeContext = { role: 'Employee' as const, businessId: 'business-2', permissions: restrictedPermissions };
const customerOnlyEmployeeContext = { role: 'Employee' as const, businessId: 'business-1', permissions: employeeCustomerOnlyPermissions };

describe('dashboard controller permissions', () => {
  test('allows Admin to manage directory and admin modules only', () => {
    assert.equal(canManageModuleForSession(adminContext, 'customers'), true);
    assert.equal(canManageModuleForSession(adminContext, 'reports'), true);
    assert.equal(canManageModuleForSession(adminContext, 'additions'), true);
    assert.equal(canManageModuleForSession(adminContext, 'services'), false);
  });

  test('unlocks business modules from the assigned permissions', () => {
    assert.equal(canAccessModuleForSession(businessContext, 'dashboard'), true);
    assert.equal(canAccessModuleForSession(businessContext, 'customers'), true);
    assert.equal(canAccessModuleForSession(businessContext, 'services'), true);
    assert.equal(canAccessModuleForSession(businessContext, 'transactions'), true);
    assert.equal(canAccessModuleForSession(businessContext, 'reports'), true);
    assert.equal(canAccessModuleForSession(businessContext, 'employee'), false);
  });

  test('keeps restricted business modules blocked when permissions are absent', () => {
    assert.equal(canAccessModuleForSession(restrictedBusinessContext, 'customers'), false);
    assert.equal(canManageModuleForSession(restrictedBusinessContext, 'services'), false);
    assert.equal(canDeleteModuleForSession(restrictedBusinessContext, 'reports'), false);
  });

  test('applies business permissions to employee modules, including transaction access', () => {
    assert.equal(canManageModuleForSession(employeeContext, 'services'), true);
    assert.equal(canManageModuleForSession(restrictedEmployeeContext, 'services'), false);
    assert.equal(canManageModuleForSession(employeeContext, 'transactions'), true);
    assert.equal(canManageModuleForSession(restrictedEmployeeContext, 'transactions'), false);
    assert.equal(canManageModuleForSession(restrictedEmployeeContext, 'customers'), false);
  });

  test('lets employee-specific permissions narrow access inside the business scope', () => {
    assert.equal(canAccessModuleForSession(customerOnlyEmployeeContext, 'customers'), true);
    assert.equal(canAccessModuleForSession(customerOnlyEmployeeContext, 'transactions'), false);
    assert.equal(canManageModuleForSession(customerOnlyEmployeeContext, 'customers'), true);
    assert.equal(canManageModuleForSession(customerOnlyEmployeeContext, 'services'), false);
  });

  test('separates add-only customer access from customer directory access', () => {
    assert.equal(canAccessModuleForSession(addOnlyBusinessContext, 'customers'), true);
    assert.equal(canPerformModuleActionForSession(addOnlyBusinessContext, 'customers', 'add'), true);
    assert.equal(canPerformModuleActionForSession(addOnlyBusinessContext, 'customers', 'edit'), false);
    assert.equal(canViewModuleRecordsForSession(addOnlyBusinessContext, 'customers'), false);
  });

  test('lets account management follow the new master account permission', () => {
    assert.equal(canPerformModuleActionForSession(employeeContext, 'accounts', 'edit'), true);
    assert.equal(canPerformModuleActionForSession(restrictedEmployeeContext, 'accounts', 'edit'), false);
    assert.equal(canAccessModuleForSession(restrictedEmployeeContext, 'accounts'), true);
  });

  test('makes delete permission Admin-only for role-level checks', () => {
    assert.equal(canDeleteRecordsForRole('Admin'), true);
    assert.equal(canDeleteRecordsForRole('Employee'), false);
    assert.equal(canDeleteRecordsForRole('Customer'), false);
  });
});

describe('dashboard controller visible data', () => {
  test('shows operational data to employees when the business allows the module', () => {
    assert.deepEqual(getVisibleServices(employeeContext, services), services);
    assert.deepEqual(getVisibleCustomers(employeeContext, customers), customers);
    assert.deepEqual(getVisibleTransactions(employeeContext, transactions), transactions);
  });

  test('shows business customers and services only when the permissions allow them', () => {
    assert.deepEqual(getVisibleServices(businessContext, services), services);
    assert.deepEqual(getVisibleCustomers(businessContext, customers), customers);
    assert.deepEqual(getVisibleServices(restrictedBusinessContext, services), []);
    assert.deepEqual(getVisibleCustomers(restrictedBusinessContext, customers), []);
  });

  test('keeps the customer directory hidden when the business only has add-customer access', () => {
    assert.deepEqual(getVisibleCustomers(addOnlyBusinessContext, customers), []);
  });

  test('shows transaction records to the business role for transaction management', () => {
    assert.deepEqual(getVisibleTransactions(businessContext, transactions), transactions);
  });
});

describe('dashboard controller search', () => {
  test('returns empty results for an empty query', () => {
    const matches = getSearchMatches({
      context: employeeContext,
      query: '   ',
      services,
      customers,
      transactions,
    });

    assert.equal(matches.services.length, 0);
    assert.equal(matches.customers.length, 0);
    assert.equal(matches.transactions.length, 0);
  });

  test('searches services, customers, and transactions for employees', () => {
    const matches = getSearchMatches({
      context: employeeContext,
      query: 'jane',
      services,
      customers,
      transactions,
    });

    assert.deepEqual(matches.customers.map((customer) => customer.id), ['customer-2']);
    assert.deepEqual(matches.transactions.map((transaction) => transaction.id), ['transaction-2']);
    assert.deepEqual(matches.services, []);
  });

  test('does not expose blocked modules through search for businesses', () => {
    const matches = getSearchMatches({
      context: restrictedBusinessContext,
      query: 'jane',
      services,
      customers,
      transactions,
    });

    assert.deepEqual(matches.services, []);
    assert.deepEqual(matches.customers, []);
    assert.deepEqual(matches.transactions, []);
  });

  test('lets businesses search their accessible modules only', () => {
    const matches = getSearchMatches({
      context: businessContext,
      query: 'retail counter',
      services,
      customers,
      transactions,
    });

    assert.deepEqual(matches.services.map((service) => service.id), ['service-1', 'service-2']);
    assert.deepEqual(matches.customers, []);
    assert.deepEqual(matches.transactions.map((transaction) => transaction.id), ['transaction-1', 'transaction-2']);
  });
});

describe('dashboard controller summaries', () => {
  test('summarizes transaction counts and total volume', () => {
    assert.deepEqual(getTransactionSummary(transactions), {
      totalVolume: 225.5,
      completed: 1,
      pending: 1,
      disputes: 1,
    });
  });

  test('summarizes an empty transaction list without errors', () => {
    assert.deepEqual(getTransactionSummary([]), {
      totalVolume: 0,
      completed: 0,
      pending: 0,
      disputes: 0,
    });
  });
});
