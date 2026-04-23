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
): Promise<BackendApiResult> => {
  const response = await fetch(buildBackendApiUrl(resource, searchParams), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: token,
    },
    cache: 'no-store',
  });

  const rawBody = await response.text();

  return {
    statusCode: response.status,
    body: parseJsonText(rawBody),
  };
};

