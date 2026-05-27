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
  test('keeps login focused on authentication without module prefetching', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';
    const calls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);

      if (url.endsWith('/login')) {
        return new Response(JSON.stringify({
          status: true,
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

      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const result = await loginAndLoadWorkspaceBootstrap('admin@example.test', 'test-password');

    assert.equal(result.accessToken, 'admin-token');
    assert.equal(result.body?.data && typeof result.body.data === 'object' && 'role' in result.body.data ? result.body.data.role : null, 1);
    assert.deepEqual(calls, [
      'https://api.example.test/login',
    ]);
  });

  test('accepts nested auth token fields from backend login responses', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/login')) {
        return new Response(JSON.stringify({
          status: true,
          message: 'User login successfully.',
          data: {
            user: {
              id: 4,
              fullname: 'Business User',
              email_id: 'business@example.test',
              user_type: 'Business',
              role: 2,
              authToken: 'nested-login-token',
            },
          },
        }), { status: 200 });
      }

      return new Response(null, { status: 404 });
    }) as typeof fetch;

    const result = await loginAndLoadWorkspaceBootstrap('business@example.test', 'test-password');

    assert.equal(result.accessToken, 'nested-login-token');
  });
});
