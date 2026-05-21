import {
  AppApiError,
  requestAppApi,
  requestAppApiMutation,
} from './client';
import {
  isRecord,
  readJoinedMessage,
} from '../mappers/legacy-record';
import {
  buildRoleTemplatePrivilegesPayload,
} from '../mappers/role-template-mapper';
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

const runRoleMutation = async (body: Record<string, unknown>): Promise<RoleTemplateActionResult> => {
  try {
    // Frontend calls the local role route; backend auth is handled server-side.
    const payload = await requestAppApiMutation('/api/roles', body);

    return {
      ok: true,
      statusCode: 200,
      payload,
      error: '',
    };
  } catch (error) {
    if (error instanceof AppApiError) {
      return {
        ok: false,
        statusCode: error.statusCode ?? 502,
        payload: error.body,
        error: readBackendErrorMessage(error.body, error.message || 'Unable to complete the role request.'),
      };
    }

    return {
      ok: false,
      statusCode: 502,
      payload: null,
      error: error instanceof Error ? error.message : 'Unable to complete the role request.',
    };
  }
};

export const fetchRoleTemplates = async () => {
  try {
    // Roles list is loaded only when the Roles page or user form asks for it.
    const payload = await requestAppApi('/api/roles');

    return {
      ok: true,
      statusCode: 200,
      payload,
      error: '',
    };
  } catch (error) {
    if (error instanceof AppApiError) {
      return {
        ok: false,
        statusCode: error.statusCode ?? 502,
        payload: error.body,
        error: readBackendErrorMessage(error.body, error.message || 'Unable to load roles.'),
      };
    }

    return {
      ok: false,
      statusCode: 502,
      payload: null,
      error: error instanceof Error ? error.message : 'Unable to load roles.',
    };
  }
};

export const createRoleTemplate = async ({
  roleName,
  privileges,
  backendPrivileges,
}: SaveRoleTemplateInput) => {
  // Create role runs only after the create role form is submitted.
  return runRoleMutation({
    action: 'create',
    role_name: roleName,
    privileges: JSON.stringify(buildRoleTemplatePrivilegesPayload(privileges, backendPrivileges)),
  });
};

export const updateRoleTemplate = async ({
  id,
  roleName,
  privileges,
  backendPrivileges,
}: SaveRoleTemplateInput): Promise<RoleTemplateActionResult> => {
  if (!id) {
    return {
      ok: false,
      statusCode: 400,
      payload: null,
      error: 'Role id is required to update a role.',
    };
  }

  // Update role runs only after the edit role form is submitted.
  return runRoleMutation({
    action: 'update',
    id,
    role_name: roleName,
    privileges: JSON.stringify(buildRoleTemplatePrivilegesPayload(privileges, backendPrivileges)),
  });
};

export const deleteRoleTemplate = async (id: string) => {
  // Delete role runs only after the delete confirmation action.
  return runRoleMutation({ action: 'delete', id });
};
