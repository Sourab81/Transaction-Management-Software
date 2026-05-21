import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { AppApiError } from '../lib/api/client';
import {
  createAccount,
  deleteAccount,
  getAccountsResponse,
  linkAccountToDepartment,
} from '../lib/api/accounts';

const originalFetch = globalThis.fetch;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (typeof originalApiBaseUrl === 'string') {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    return;
  }

  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

describe('accounts api client', () => {
  test('loads accounts through the local accounts API route', async () => {
    let requestedInput: RequestInfo | URL | null = null;
    let requestedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init) => {
      requestedInput = input;
      requestedInit = init;

      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    };

    await getAccountsResponse();

    assert.equal(requestedInput, '/api/accounts');
    assert.equal(requestedInit?.method, 'GET');
  });

  test('posts createAccount payload to the local accounts API using backend field names', async () => {
    let postedPayload: Record<string, unknown> | null = null;

    globalThis.fetch = async (input, init) => {
      assert.equal(input, '/api/accounts');
      assert.equal(init?.method, 'POST');
      postedPayload = JSON.parse(String(init?.body));

      return new Response(JSON.stringify({ status: true }), { status: 200 });
    };

    await createAccount({
      accountHolder: 'SBI CURRENT',
      bankName: 'SBI CURRENT',
      accountNumber: '0',
      ifsc: '0',
      openingBalance: 41549,
      status: 'Active',
      counterId: null,
      branch: 'Main',
      remark: 'OB 01102024',
    });

    assert.deepEqual(postedPayload, {
      action: 'create',
      acc_holder: 'SBI CURRENT',
      bank_name: 'SBI CURRENT',
      acc_no: '0',
      ifsc_code: '0',
      branch: 'Main',
      opening_balance: 41549,
      remark: 'OB 01102024',
      status: 1,
    });
  });

  test('posts soft delete and link department actions through the local route', async () => {
    const postedPayloads: unknown[] = [];

    globalThis.fetch = async (input, init) => {
      assert.equal(input, '/api/accounts');
      postedPayloads.push(JSON.parse(String(init?.body)));

      return new Response(JSON.stringify({ status: true }), { status: 200 });
    };

    await deleteAccount('5');
    await linkAccountToDepartment('5', '9');

    assert.deepEqual(postedPayloads, [
      { action: 'delete', id: '5' },
      { action: 'linkDepartment', account_id: '5', counter_id: '9' },
    ]);
  });

  test('surfaces local accounts API errors', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({
      success: false,
      message: 'Account id is required.',
    }), { status: 400 });

    await assert.rejects(
      () => deleteAccount(''),
      (error: unknown) => {
        assert(error instanceof AppApiError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, 'Account id is required.');
        return true;
      },
    );
  });
});
