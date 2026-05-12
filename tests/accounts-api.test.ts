import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import {
  createAccount,
  deleteAccount,
  linkAccountToDepartment,
} from '../lib/api/accounts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('accounts api client', () => {
  test('posts createAccount payload using backend account field names', async () => {
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

  test('posts soft delete and link department actions', async () => {
    const postedPayloads: unknown[] = [];

    globalThis.fetch = async (_input, init) => {
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
});
