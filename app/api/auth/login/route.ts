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
import { readLoginPayload } from './login-payload';

export const dynamic = 'force-dynamic';

// TODO(server-actions): keep this route for backward compatibility while the
// login form migrates to app/login/actions.ts.

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

  if (!username || password === null || password.length === 0) {
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
