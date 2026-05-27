import { cookies } from 'next/headers';
import type { LoginApiResponseBody } from '../../../lib/api/auth';
import { AUTH_TOKEN_COOKIE_NAME, getAuthTokenServerCookieOptions } from '../../../lib/auth-cookie';
import {
  LoginWorkspaceBootstrapError,
  loginAndLoadWorkspaceBootstrap,
} from '../../../lib/api/login-workspace-bootstrap';
import {
  WORKSPACE_PREFETCH_COOKIE_NAME,
  getWorkspacePrefetchServerCookieOptions,
} from '../../../lib/workspace-prefetch-cookie';

export const dynamic = 'force-dynamic';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readLoginPayload = async (request: Request) => {
  const payload = await request.json().catch(() => null);
  const record = isRecord(payload) ? payload : null;
  const email = typeof record?.email === 'string' ? record.email.trim().toLowerCase() : '';
  const password = typeof record?.password === 'string' ? record.password : '';

  return { email, password };
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
  const { email, password } = await readLoginPayload(request);

  if (!email || password.length === 0) {
    return Response.json(
      { status: false, message: 'Email and password are required.' },
      { status: 400 },
    );
  }

  try {
    const { statusCode, body, accessToken } =
      await loginAndLoadWorkspaceBootstrap(email, password);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_TOKEN_COOKIE_NAME, accessToken, getAuthTokenServerCookieOptions());

    return Response.json(body, { status: statusCode });
  } catch (error) {
    await clearBootstrapCookies();

    if (error instanceof LoginWorkspaceBootstrapError) {
      return Response.json(
        (error.body as LoginApiResponseBody | null) ?? { status: false, message: error.message },
        { status: error.statusCode && error.statusCode >= 400 ? error.statusCode : 401 },
      );
    }

    return Response.json(
      { status: false, message: 'Unable to reach the login service. Check the API server and try again.' },
      { status: 502 },
    );
  }
}
