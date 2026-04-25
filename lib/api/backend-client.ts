import {
  getBackendApiBaseUrl,
  getBackendApiResourceConfig,
  type BackendApiResource,
} from './backend-endpoints';
import { parseJsonText } from '../mappers/legacy-record';

export interface BackendApiResult {
  statusCode: number;
  body: unknown;
}

export class BackendApiConfigurationError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 501) {
    super(message);
    this.name = 'BackendApiConfigurationError';
    this.statusCode = statusCode;
  }
}

const buildBackendApiUrl = (resource: BackendApiResource, searchParams?: URLSearchParams) => {
  const config = getBackendApiResourceConfig(resource);

  if (!config.path) {
    throw new BackendApiConfigurationError(
      `The ${config.label} endpoint is not configured yet. Set ${config.envPathKey} before enabling this module.`,
    );
  }

  const url = new URL(`${getBackendApiBaseUrl()}/${config.path.replace(/^\/+/, '')}`);

  if (searchParams) {
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
};

export const requestBackendCollection = async (
  resource: BackendApiResource,
  token: string,
  searchParams?: URLSearchParams,
  bodyValues?: Record<string, string | number | undefined>,
): Promise<BackendApiResult> => {
  const config = getBackendApiResourceConfig(resource);
  const requestBody = bodyValues
    ? new URLSearchParams(Object.entries(bodyValues).reduce<Record<string, string>>((output, [key, value]) => {
        if (typeof value !== 'undefined' && value !== null) {
          output[key] = String(value);
        }
        return output;
      }, {}))
    : config.method === 'POST'
      ? new URLSearchParams(config.defaultBody ?? {})
      : undefined;

  // Some backend list endpoints, such as getUsers, are POST endpoints that still
  // expect pagination values as form fields. Keep GET query strings and POST form
  // bodies separate so the same local proxy can support both styles.
  if (requestBody && searchParams) {
    searchParams.forEach((value, key) => {
      requestBody.set(key, value);
    });
  }

  const response = await fetch(buildBackendApiUrl(resource, requestBody ? undefined : searchParams), {
    method: config.method,
    headers: {
      Accept: 'application/json',
      Authorization: token,
      ...(requestBody ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' } : {}),
    },
    body: requestBody?.toString(),
    cache: 'no-store',
  });

  const rawBody = await response.text();

  return {
    statusCode: response.status,
    body: parseJsonText(rawBody),
  };
};
