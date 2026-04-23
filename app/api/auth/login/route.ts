import { cookies } from 'next/headers';
import { type LoginApiResponseBody, LoginApiError, loginWithApi } from '../../../../lib/api/auth';
import { AUTH_TOKEN_COOKIE_NAME, getAuthTokenServerCookieOptions } from '../../../../lib/auth-cookie';
import { extractAccessToken } from '../../../../lib/mappers/session-user-mapper';

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

export async function POST(request: Request) {
  const { username, password } = await readLoginPayload(request);

  if (!username || !password) {
    return Response.json(
      { message: 'Username and password are required.' },
      { status: 400 },
    );
  }

  try {
    const { statusCode, body } = await loginWithApi(username, password);
    const accessToken = extractAccessToken(body as LoginApiResponseBody | null);

    if (accessToken) {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_TOKEN_COOKIE_NAME, accessToken, getAuthTokenServerCookieOptions());
    }

    return Response.json(body, { status: statusCode });
  } catch (error) {
    if (error instanceof LoginApiError) {
      return Response.json(
        error.body ?? { message: error.message },
        { status: error.statusCode ?? 502 },
      );
    }

    return Response.json(
      { message: 'Unable to reach the login service. Check the API server and try again.' },
      { status: 502 },
    );
  }
}
