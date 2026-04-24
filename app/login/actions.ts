'use server';

import { cookies } from 'next/headers';
import {
  AUTH_TOKEN_COOKIE_NAME,
  getAuthTokenServerCookieOptions,
} from '../../lib/auth-cookie';
import {
  LoginWorkspaceBootstrapError,
  loginAndLoadWorkspaceBootstrap,
} from '../../lib/api/login-workspace-bootstrap';
import {
  WORKSPACE_PREFETCH_COOKIE_NAME,
  getWorkspacePrefetchServerCookieOptions,
  serializePrefetchedWorkspaceDataCookieValue,
} from '../../lib/workspace-prefetch-cookie';
import type { LoginApiResponseBody } from '../../lib/api/auth';

export interface LoginActionResult {
  ok: boolean;
  body: LoginApiResponseBody | null;
  message: string;
  statusCode?: number;
  email: string;
  submitted: boolean;
}

const readStringFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
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

export async function loginWithServerAction(
  _previousState: LoginActionResult,
  formData: FormData,
): Promise<LoginActionResult> {
  const normalizedEmail = readStringFormValue(formData, 'email').toLowerCase();
  const normalizedPassword = readStringFormValue(formData, 'password');

  if (!normalizedEmail || !normalizedPassword) {
    return {
      ok: false,
      body: null,
      message: 'Username and password are required.',
      statusCode: 400,
      email: normalizedEmail,
      submitted: true,
    };
  }

  try {
    const { statusCode, body, accessToken, counters } =
      await loginAndLoadWorkspaceBootstrap(
        normalizedEmail,
        normalizedPassword,
      );
    const cookieStore = await cookies();
    cookieStore.set(
      AUTH_TOKEN_COOKIE_NAME,
      accessToken,
      getAuthTokenServerCookieOptions(),
    );
    cookieStore.set(
      WORKSPACE_PREFETCH_COOKIE_NAME,
      serializePrefetchedWorkspaceDataCookieValue({ counters }),
      getWorkspacePrefetchServerCookieOptions(),
    );

    return {
      ok: true,
      body,
      message: '',
      statusCode,
      email: normalizedEmail,
      submitted: true,
    };
  } catch (error) {
    await clearBootstrapCookies();

    if (error instanceof LoginWorkspaceBootstrapError) {
      return {
        ok: false,
        body: (error.body as LoginApiResponseBody | null) ?? null,
        message: error.message,
        statusCode: error.statusCode ?? 502,
        email: normalizedEmail,
        submitted: true,
      };
    }

    return {
      ok: false,
      body: null,
      message: 'Unable to reach the login service. Check the API server and try again.',
      statusCode: 502,
      email: normalizedEmail,
      submitted: true,
    };
  }
}
