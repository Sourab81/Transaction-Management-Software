import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE_NAME } from '../auth-cookie';
import {
  BackendApiConfigurationError,
  requestBackendCollection,
} from './backend-client';
import {
  getBackendApiResourceConfig,
  type BackendApiResource,
} from './backend-endpoints';

const normalizeResponseBody = (body: unknown, fallbackMessage: string) => {
  if (body === null || typeof body === 'undefined') {
    return { message: fallbackMessage };
  }

  if (typeof body === 'string') {
    return { message: body };
  }

  return body;
};

export const proxyAuthenticatedGetRequest = async (
  resource: BackendApiResource,
  request?: Request,
) => {
  const config = getBackendApiResourceConfig(resource);

  if (!config.path) {
    return Response.json(
      {
        message: `The ${config.label} endpoint is not configured yet.`,
        envKey: config.envPathKey,
      },
      { status: 501 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim();

  if (!token) {
    return Response.json(
      { message: `No auth token cookie is available for the ${config.label} request.` },
      { status: 401 },
    );
  }

  try {
    const searchParams = request ? new URL(request.url).searchParams : undefined;
    const response = await requestBackendCollection(resource, token, searchParams);

    return Response.json(
      normalizeResponseBody(response.body, `Unable to load ${config.label} from the backend.`),
      { status: response.statusCode },
    );
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      return Response.json(
        { message: error.message, envKey: config.envPathKey },
        { status: error.statusCode },
      );
    }

    return Response.json(
      { message: `Unable to reach the ${config.label} service right now.` },
      { status: 502 },
    );
  }
};

export const proxyAuthenticatedPostRequest = async (
  resource: BackendApiResource,
  request: Request,
) => {
  const config = getBackendApiResourceConfig(resource);

  if (!config.path) {
    return Response.json(
      {
        message: `The ${config.label} endpoint is not configured yet.`,
        envKey: config.envPathKey,
      },
      { status: 501 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim();

  if (!token) {
    return Response.json(
      { message: `No auth token cookie is available for the ${config.label} request.` },
      { status: 401 },
    );
  }

  try {
    const payload = await request.json();
    const bodyValues = {
      username: payload.username,
      password: payload.password,
      fullname: payload.fullname,
      role: payload.role,
      email_id: payload.email_id,
      contact_no: payload.contact_no,
      role_template_id: payload.role_template_id,
      permission: payload.permission,
      privileges: payload.privileges,
    } as Record<string, string | undefined>;

    const response = await requestBackendCollection(resource, token, undefined, bodyValues);

    return Response.json(
      normalizeResponseBody(response.body, `Unable to create ${config.label} in the backend.`),
      { status: response.statusCode },
    );
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      return Response.json(
        { message: error.message, envKey: config.envPathKey },
        { status: error.statusCode },
      );
    }

    return Response.json(
      { message: `Unable to reach the ${config.label} service right now.` },
      { status: 502 },
    );
  }
};
