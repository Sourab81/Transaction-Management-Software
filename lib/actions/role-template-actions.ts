'use server';

import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE_NAME } from '../auth-cookie';
import {
  BackendApiConfigurationError,
  requestBackendCollection,
} from '../api/backend-client';
import {
  isRecord,
  readJoinedMessage,
} from '../mappers/legacy-record';
import {
  buildRoleTemplatePrivilegesPayload,
} from '../mappers/role-template-mapper';
import type { BackendApiResource } from '../api/backend-endpoints';
import type { CustomerPermissions } from '../permissions';

interface RoleTemplateActionResult {
  ok: boolean;
  statusCode: number;
  payload: unknown;
  error: string;
}

interface SaveRoleTemplateInput {
  id?: string;
  roleName: string;
  privileges: CustomerPermissions;
  backendPrivileges?: Record<string, unknown>;
}

const readBackendErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    return readJoinedMessage(payload.message) || readJoinedMessage(payload.error) || fallback;
  }

  return fallback;
};

const getAuthToken = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim() || null;
};

const runRoleRequest = async (
  resource: BackendApiResource,
  bodyValues?: Record<string, string | number | undefined>,
): Promise<RoleTemplateActionResult> => {
  const token = await getAuthToken();

  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      payload: null,
      error: 'No auth token cookie is available for the role request.',
    };
  }

  try {
    const response = await requestBackendCollection(resource, token, undefined, bodyValues);
    const fallbackMessage = 'Unable to complete the role request.';

    if (response.statusCode >= 400) {
      return {
        ok: false,
        statusCode: response.statusCode,
        payload: response.body,
        error: readBackendErrorMessage(response.body, fallbackMessage),
      };
    }

    return {
      ok: true,
      statusCode: response.statusCode,
      payload: response.body,
      error: '',
    };
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      return {
        ok: false,
        statusCode: error.statusCode,
        payload: null,
        error: error.message,
      };
    }

    return {
      ok: false,
      statusCode: 502,
      payload: null,
      error: 'Unable to reach the role service right now.',
    };
  }
};

export const fetchRoleTemplates = async () => runRoleRequest('roles');

export const createRoleTemplate = async ({
  roleName,
  privileges,
  backendPrivileges,
}: SaveRoleTemplateInput) => runRoleRequest('roleCreate', {
  role_name: roleName,
  privileges: JSON.stringify(buildRoleTemplatePrivilegesPayload(privileges, backendPrivileges)),
});

export const updateRoleTemplate = async ({
  id,
  roleName,
  privileges,
  backendPrivileges,
}: SaveRoleTemplateInput) => {
  if (!id) {
    return {
      ok: false,
      statusCode: 400,
      payload: null,
      error: 'Role id is required to update a role.',
    };
  }

  return runRoleRequest('roleUpdate', {
    id,
    role_name: roleName,
    privileges: JSON.stringify(buildRoleTemplatePrivilegesPayload(privileges, backendPrivileges)),
  });
};

export const deleteRoleTemplate = async (id: string) => {
  // Backend role delete is documented as POST. Use a form field named "id" to
  // match the create/update form-field style used by the same role API group.
  return runRoleRequest('roleDelete', { id });
};
