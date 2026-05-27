import {
  type LoginApiResponseBody,
  LoginApiError,
  loginWithApi,
} from './auth';
import { extractAccessToken } from '../mappers/session-user-mapper';

export interface LoginWorkspaceBootstrapResult {
  statusCode: number;
  body: LoginApiResponseBody | null;
  accessToken: string;
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

const readLoginMessage = (body: LoginApiResponseBody | null, fallback: string) => {
  const message = body?.message;

  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  if (message && typeof message === 'object') {
    const joinedMessage = Object.values(message)
      .map((value) => typeof value === 'string' ? value.trim() : '')
      .filter(Boolean)
      .join(' ');

    if (joinedMessage) return joinedMessage;
  }

  return fallback;
};

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

  if (loginResult.body?.status !== true) {
    throw new LoginWorkspaceBootstrapError(
      readLoginMessage(loginResult.body, 'Invalid email or password.'),
      loginResult.statusCode >= 400 ? loginResult.statusCode : 401,
      loginResult.body,
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

  return {
    ...loginResult,
    accessToken,
  };
};
