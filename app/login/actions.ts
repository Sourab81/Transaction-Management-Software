'use server';

import { cookies } from 'next/headers';
import {
  type LoginApiResponseBody,
  LoginApiError,
  loginWithApi,
} from '../../lib/api/auth';
import {
  AUTH_TOKEN_COOKIE_NAME,
  getAuthTokenServerCookieOptions,
} from '../../lib/auth-cookie';
import { extractAccessToken } from '../../lib/mappers/session-user-mapper';

export interface LoginActionResult {
  ok: boolean;
  body: LoginApiResponseBody | null;
  message?: string;
  statusCode?: number;
}

interface LoginActionInput {
  email: string;
  password: string;
}

export async function loginWithServerAction({
  email,
  password,
}: LoginActionInput): Promise<LoginActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return {
      ok: false,
      body: null,
      message: 'Username and password are required.',
      statusCode: 400,
    };
  }

  try {
    const { statusCode, body } = await loginWithApi(
      normalizedEmail,
      normalizedPassword,
    );
    const accessToken = extractAccessToken(body);

    if (accessToken) {
      const cookieStore = await cookies();
      cookieStore.set(
        AUTH_TOKEN_COOKIE_NAME,
        accessToken,
        getAuthTokenServerCookieOptions(),
      );
    }

    return {
      ok: true,
      body,
      statusCode,
    };
  } catch (error) {
    if (error instanceof LoginApiError) {
      return {
        ok: false,
        body: error.body,
        message: error.message,
        statusCode: error.statusCode ?? 502,
      };
    }

    return {
      ok: false,
      body: null,
      message: 'Unable to reach the login service. Check the API server and try again.',
      statusCode: 502,
    };
  }
}
