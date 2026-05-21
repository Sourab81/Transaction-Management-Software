import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import { isRecord } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const readPayload = async (request: Request) => {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
};

const readRequiredString = (
  payload: Record<string, unknown>,
  key: string,
  label: string,
) => {
  const value = payload[key];

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return Response.json(
    { success: false, message: `${label} is required.` },
    { status: 400 },
  );
};

const errorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      isRecord(error.body) || Array.isArray(error.body) || typeof error.body === 'string'
        ? error.body
        : { success: false, message: error.message || fallbackMessage },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json(
    { success: false, message: fallbackMessage },
    { status: 502 },
  );
};

const listRoles = async () => {
  // Token is httpOnly, so role backend calls must happen in this server route.
  const payload = await backendFetch('getRoles', {
    method: 'POST',
    body: {},
  });

  return Response.json(payload);
};

export async function GET() {
  try {
    return await listRoles();
  } catch (error) {
    return errorResponse(error, 'Unable to load roles from the backend.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);

  if (!isRecord(payload)) {
    return Response.json(
      { success: false, message: 'Invalid role request payload.' },
      { status: 400 },
    );
  }

  const action = typeof payload.action === 'string' ? payload.action : 'list';

  if (action === 'list') {
    try {
      return await listRoles();
    } catch (error) {
      return errorResponse(error, 'Unable to load roles from the backend.');
    }
  }

  const endpointByAction: Record<string, string> = {
    create: 'createRoleByAdmin',
    update: 'updateRoleByAdmin',
    delete: 'deleteRoleByAdmin',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json(
      { success: false, message: 'Unsupported role action.' },
      { status: 400 },
    );
  }

  if (action === 'create' || action === 'update') {
    const roleName = readRequiredString(payload, 'role_name', 'Role name');
    if (roleName instanceof Response) {
      return roleName;
    }

    payload.role_name = roleName;
  }

  if (action === 'update' || action === 'delete') {
    const id = readRequiredString(payload, 'id', 'Role id');
    if (id instanceof Response) {
      return id;
    }

    payload.id = id;
  }

  const backendPayload = { ...payload };
  delete backendPayload.action;

  try {
    // Frontend calls /api/roles; this route forwards confirmed role actions.
    const responsePayload = await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    });

    return Response.json(responsePayload);
  } catch (error) {
    return errorResponse(error, 'Unable to complete role request in the backend.');
  }
}
