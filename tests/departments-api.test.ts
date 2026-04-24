import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import {
  DepartmentsApiError,
  getDepartmentsWithToken,
} from '../lib/api/departments';

const originalFetch = globalThis.fetch;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

describe('departments api', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (typeof originalApiBaseUrl === 'string') {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
      return;
    }

    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  test('requests counters with the raw auth token and maps them into department data', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://backend.example.test';

    let requestedUrl = '';
    let requestedHeaders: HeadersInit | undefined;

    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      requestedHeaders = init?.headers;

      return new Response(JSON.stringify({
        data: [
          {
            counter_id: 42,
            department_name: 'Main Counter',
            balance: '2500',
            is_active: '1',
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const counters = await getDepartmentsWithToken('raw-session-token');

    assert.equal(requestedUrl, 'https://backend.example.test/getCounters');
    assert.deepEqual(requestedHeaders, {
      Accept: 'application/json',
      Authorization: 'raw-session-token',
    });
    assert.deepEqual(counters, [
      {
        id: '42',
        name: 'Main Counter',
        code: 'CTR-42',
        openingBalance: 0,
        currentBalance: 2500,
        status: 'Active',
      },
    ]);
  });

  test('surfaces unauthorized department errors from the backend', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://backend.example.test';

    globalThis.fetch = async () => new Response(JSON.stringify({
      message: 'Counters unauthorized',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

    await assert.rejects(
      () => getDepartmentsWithToken('raw-session-token'),
      (error: unknown) => {
        assert(error instanceof DepartmentsApiError);
        assert.equal(error.statusCode, 401);
        assert.equal(error.message, 'Counters unauthorized');
        return true;
      },
    );
  });
});
