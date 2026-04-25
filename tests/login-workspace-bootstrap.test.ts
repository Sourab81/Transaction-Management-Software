import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { loginAndLoadWorkspaceBootstrap } from '../lib/api/login-workspace-bootstrap';

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (typeof originalBaseUrl === 'undefined') {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
  }
});

describe('login workspace bootstrap', () => {
  test('keeps login successful when counter prefetch fails after backend auth succeeds', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';
    const calls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);

      if (url.endsWith('/login')) {
        return new Response(JSON.stringify({
          status: 200,
          message: 'User login successfully.',
          data: {
            id: 2,
            fullname: 'Admin',
            email_id: 'admin@example.test',
            username: 'admin@example.test',
            user_type: 'Admin',
            role: 1,
            token: 'admin-token',
          },
        }), { status: 200 });
      }

      if (url.endsWith('/getCounters')) {
        return new Response(JSON.stringify({
          status: 400,
          message: 'Counter data is not available for this login.',
          data: null,
        }), { status: 400 });
      }

      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const result = await loginAndLoadWorkspaceBootstrap('admin@example.test', 'test-password');

    assert.equal(result.accessToken, 'admin-token');
    assert.equal(result.body?.data && typeof result.body.data === 'object' && 'role' in result.body.data ? result.body.data.role : null, 1);
    assert.deepEqual(result.counters, []);
    assert.deepEqual(calls, [
      'https://api.example.test/login',
      'https://api.example.test/getCounters',
    ]);
  });
});
