import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { requestBackendCollection } from '../lib/api/backend-client';
import { mapBusinessesResponse } from '../lib/mappers/business-mapper';
import { mapEmployeeRecord } from '../lib/mappers/employee-mapper';
import { createCustomerPermissions } from '../lib/platform-structure';
import {
  createBusinessWorkspaceFromPermissions,
  hydratePersistedAppState,
  sanitizeAppStateForStorage,
  type AppState,
  type Business,
  type Employee,
} from '../lib/store';
import BusinessForm from '../components/forms/BusinessForm';
import EmployeeForm from '../components/forms/EmployeeForm';

const originalFetch = globalThis.fetch;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const permissions = createCustomerPermissions([
  'customers_list',
  'employee_list',
]);

const buildUnsafeState = (): AppState => {
  const workspace = createBusinessWorkspaceFromPermissions(permissions);
  workspace.employees = [
    {
      id: 'employee-1',
      name: 'Stored Employee',
      phone: '9876500001',
      email: 'stored.employee@example.test',
      permissions,
      departmentId: 'counter-1',
      status: 'Active',
      joinedDate: '2026-01-01',
      password: 'stored-employee-secret',
    } as Employee & { password: string },
  ];

  return {
    businesses: [
      {
        id: 'business-1',
        name: 'Stored Business',
        phone: '9876500000',
        email: 'stored.business@example.test',
        permissions,
        status: 'Active',
        joinedDate: '2026-01-01',
        password: 'stored-business-secret',
      } as Business & { password: string },
    ],
    businessWorkspacesById: {
      'business-1': workspace,
    },
    adminWorkspace: {
      notifications: [],
      historyEvents: [],
      reports: [],
      additionOptions: [],
    },
  };
};

describe('password sanitization', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (typeof originalApiBaseUrl === 'string') {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
      return;
    }

    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  test('persisted app state strips legacy password fields before saving', () => {
    const persistedState = sanitizeAppStateForStorage(buildUnsafeState());
    const serializedState = JSON.stringify(persistedState);

    assert.equal(serializedState.includes('stored-business-secret'), false);
    assert.equal(serializedState.includes('stored-employee-secret'), false);
    assert.equal(serializedState.includes('"password"'), false);
  });

  test('hydration ignores legacy password fields from localStorage', () => {
    const hydratedState = hydratePersistedAppState(buildUnsafeState());
    const business = hydratedState.businesses[0];
    const employee = hydratedState.businessWorkspacesById['business-1']?.employees[0];

    assert.equal(Object.hasOwn(business ?? {}, 'password'), false);
    assert.equal(Object.hasOwn(employee ?? {}, 'password'), false);
  });

  test('backend mappers ignore password fields from list responses', () => {
    const employee = mapEmployeeRecord({
      id: 5,
      name: 'Mapped Employee',
      email: 'mapped.employee@example.test',
      phone: '9876500002',
      password: 'backend-employee-secret',
    });
    const businesses = mapBusinessesResponse({
      data: [
        {
          id: 6,
          fullname: 'Mapped Business',
          email_id: 'mapped.business@example.test',
          contact_no: 9876500003,
          user_type: 'Business',
          role: 2,
          password: 'backend-business-secret',
        },
      ],
    });

    assert(employee);
    assert.equal(Object.hasOwn(employee, 'password'), false);
    assert.equal(Object.hasOwn(businesses[0] ?? {}, 'password'), false);
    assert.equal(JSON.stringify({ employee, businesses }).includes('backend-'), false);
  });

  test('create-user request payload can include password only for submit transport', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://backend.example.test';
    let capturedBody = '';

    globalThis.fetch = async (_input, init) => {
      capturedBody = String(init?.body ?? '');

      return new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await requestBackendCollection('businessCreate', 'raw-token', undefined, {
      username: 'new.business@example.test',
      password: 'one-time-submit-secret',
      fullname: 'New Business',
    });

    assert.match(capturedBody, /password=one-time-submit-secret/);
  });

  test('edit forms do not prefill legacy passwords', () => {
    const businessHtml = renderToStaticMarkup(
      React.createElement(BusinessForm, {
        initialValues: {
          id: 'business-1',
          name: 'Stored Business',
          phone: '9876500000',
          email: 'stored.business@example.test',
          permissions,
          status: 'Active',
          password: 'stored-business-secret',
        } as Business & { password: string },
        submitLabel: 'Save',
        onCancel: () => {},
        onSubmit: () => {},
      }),
    );
    const employeeHtml = renderToStaticMarkup(
      React.createElement(EmployeeForm, {
        businessPermissions: permissions,
        departments: [
          {
            id: 'counter-1',
            name: 'Counter One',
            code: 'CTR-1',
            openingBalance: 0,
            currentBalance: 0,
            status: 'Active',
          },
        ],
        initialValues: {
          id: 'employee-1',
          name: 'Stored Employee',
          phone: '9876500001',
          email: 'stored.employee@example.test',
          permissions,
          departmentId: 'counter-1',
          status: 'Active',
          password: 'stored-employee-secret',
        } as Employee & { password: string },
        submitLabel: 'Save',
        onCancel: () => {},
        onSubmit: () => {},
      }),
    );

    assert.equal(businessHtml.includes('stored-business-secret'), false);
    assert.equal(employeeHtml.includes('stored-employee-secret'), false);
  });
});
