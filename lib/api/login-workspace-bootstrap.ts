import type { Counter } from '../store';
import {
  type LoginApiResponseBody,
  LoginApiError,
  loginWithApi,
} from './auth';
import { getDepartmentsWithToken } from './departments';
import { extractAccessToken } from '../mappers/session-user-mapper';

export interface LoginWorkspaceBootstrapResult {
  statusCode: number;
  body: LoginApiResponseBody | null;
  accessToken: string;
  counters: Counter[];
}

export class LoginWorkspaceBootstrapError extends Error {
  readonly statusCode: number | null;
  readonly body: unknown;

  constructor(message: string, statusCode: number | null, body: unknown) {
    super(message);
    this.name = 'LoginWorkspaceBootstrapError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export const loginAndLoadWorkspaceBootstrap = async (
  username: string,
  password: string,
): Promise<LoginWorkspaceBootstrapResult> => {
  let loginResult: {
    statusCode: number;
    body: LoginApiResponseBody | null;
  };

  try {
    loginResult = await loginWithApi(username, password);
  } catch (error) {
    if (error instanceof LoginApiError) {
      throw new LoginWorkspaceBootstrapError(
        error.message,
        error.statusCode ?? 502,
        error.body,
      );
    }

    throw new LoginWorkspaceBootstrapError(
      'Unable to reach the login service. Check the API server and try again.',
      502,
      null,
    );
  }

  const accessToken = extractAccessToken(loginResult.body);

  if (!accessToken) {
    throw new LoginWorkspaceBootstrapError(
      'Login succeeded, but no auth token was returned by the backend.',
      502,
      loginResult.body,
    );
  }

  const counters = await getDepartmentsWithToken(accessToken).catch(() => []);

  return {
    ...loginResult,
    accessToken,
    counters,
  };
};
