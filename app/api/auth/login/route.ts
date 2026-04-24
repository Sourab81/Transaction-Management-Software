import { cookies } from 'next/headers';
import type { LoginApiResponseBody } from '../../../../lib/api/auth';
import { AUTH_TOKEN_COOKIE_NAME, getAuthTokenServerCookieOptions } from '../../../../lib/auth-cookie';
import {
  LoginWorkspaceBootstrapError,
  loginAndLoadWorkspaceBootstrap,
} from '../../../../lib/api/login-workspace-bootstrap';
import {
  WORKSPACE_PREFETCH_COOKIE_NAME,
  getWorkspacePrefetchServerCookieOptions,
  serializePrefetchedWorkspaceDataCookieValue,
} from '../../../../lib/workspace-prefetch-cookie';

export const dynamic = 'force-dynamic';

// TODO(server-actions): keep this route for backward compatibility while the
// login form migrates to app/login/actions.ts.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStringValue = (source: Record<string, unknown> | null, keys: string[]) => {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const readLoginPayload = async (request: Request) => {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => null);
    const record = isRecord(payload) ? payload : null;

    return {
      username: readStringValue(record, ['username', 'email']),
      password: readStringValue(record, ['password']),
    };
  }

  const formData = await request.formData().catch(() => null);
  const username = formData?.get('username') || formData?.get('email');
  const password = formData?.get('password');

  return {
    username: typeof username === 'string' ? username.trim() : null,
    password: typeof password === 'string' ? password.trim() : null,
  };
};

const clearBootstrapCookies = async () => {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_TOKEN_COOKIE_NAME, '', {
    ...getAuthTokenServerCookieOptions(),
    maxAge: 0,
  });
  cookieStore.set(WORKSPACE_PREFETCH_COOKIE_NAME, '', {
    ...getWorkspacePrefetchServerCookieOptions(),
    maxAge: 0,
  });
};

export async function POST(request: Request) {
  const { username, password } = await readLoginPayload(request);

  if (!username || !password) {
    return Response.json(
      { message: 'Username and password are required.' },
      { status: 400 },
    );
  }

  try {
    const normalizedUsername = username.trim().toLowerCase();
    const { statusCode, body, accessToken, counters } =
      await loginAndLoadWorkspaceBootstrap(normalizedUsername, password);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_TOKEN_COOKIE_NAME, accessToken, getAuthTokenServerCookieOptions());
    cookieStore.set(
      WORKSPACE_PREFETCH_COOKIE_NAME,
      serializePrefetchedWorkspaceDataCookieValue({ counters }),
      getWorkspacePrefetchServerCookieOptions(),
    );

    return Response.json(body, { status: statusCode });
  } catch (error) {
    await clearBootstrapCookies();

    if (error instanceof LoginWorkspaceBootstrapError) {
      return Response.json(
        (error.body as LoginApiResponseBody | null) ?? { message: error.message },
        { status: error.statusCode ?? 502 },
      );
    }

    return Response.json(
      { message: 'Unable to reach the login service. Check the API server and try again.' },
      { status: 502 },
    );
  }
}
