import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { POST } from '../app/api/auth/login/route';
import { readLoginPayload } from '../app/api/auth/login/login-payload';
import { loginWithServerAction, type LoginActionResult } from '../app/login/actions';
import { readLoginFormValues } from '../app/login/login-form-values';
import { loginAndLoadWorkspaceBootstrap } from '../lib/api/login-workspace-bootstrap';

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const previousLoginState: LoginActionResult = {
  ok: false,
  body: null,
  message: '',
  email: '',
  submitted: false,
};

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (typeof originalBaseUrl === 'undefined') {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
  }
});

describe('login password fidelity', () => {
  test('route JSON payload trims login identifier but preserves password exactly', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: '  User@Example.Test  ',
        password: '  Exact PaSSword  ',
      }),
    });

    const payload = await readLoginPayload(request);

    assert.equal(payload.username, 'User@Example.Test');
    assert.equal(payload.password, '  Exact PaSSword  ');
  });

  test('server action form values trim email but preserve password exactly', () => {
    const formData = new FormData();
    formData.set('email', '  USER@Example.Test  ');
    formData.set('password', '  Exact PaSSword  ');

    const values = readLoginFormValues(formData);

    assert.equal(values.email, 'user@example.test');
    assert.equal(values.password, '  Exact PaSSword  ');
  });

  test('backend login request payload preserves leading and trailing password spaces', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';
    let loginRequestBody = '';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/login')) {
        loginRequestBody = String(init?.body ?? '');

        return new Response(JSON.stringify({
          status: 200,
          message: 'User login successfully.',
          data: {
            id: 2,
            fullname: 'Admin',
            email_id: 'user@example.test',
            username: 'user@example.test',
            user_type: 'Admin',
            role: 1,
            token: 'admin-token',
          },
        }), { status: 200 });
      }

      if (url.endsWith('/getCounters')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }

      return new Response(null, { status: 404 });
    }) as typeof fetch;

    await loginAndLoadWorkspaceBootstrap('user@example.test', '  Exact PaSSword  ');

    const params = new URLSearchParams(loginRequestBody);
    assert.equal(params.get('username'), 'user@example.test');
    assert.equal(params.get('password'), '  Exact PaSSword  ');
  });

  test('empty passwords are rejected by route and server action validation', async () => {
    const routeResponse = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: ' user@example.test ',
        password: '',
      }),
    }));

    assert.equal(routeResponse.status, 400);

    const formData = new FormData();
    formData.set('email', ' user@example.test ');
    formData.set('password', '');

    const actionResult = await loginWithServerAction(previousLoginState, formData);

    assert.equal(actionResult.ok, false);
    assert.equal(actionResult.statusCode, 400);
    assert.equal(actionResult.email, 'user@example.test');
  });
});
