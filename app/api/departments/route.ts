import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE_NAME } from '../../../lib/auth-cookie';
import {
  BackendApiConfigurationError,
  requestBackendJson,
} from '../../../lib/api/backend-client';
import { proxyAuthenticatedGetRequest } from '../../../lib/api/server-proxy';
import {
  isRecord,
  readJoinedMessage,
} from '../../../lib/mappers/legacy-record';
import {
  mapDepartmentRecord,
  mapDepartmentToCounter,
} from '../../../lib/mappers/department.mapper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return proxyAuthenticatedGetRequest('departments', request);
}

const readMessage = (body: unknown, fallback: string) => {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallback;
  }

  return fallback;
};

const readNumericIds = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<number[]>((ids, entry) => {
    const numericId = typeof entry === 'number'
      ? entry
      : typeof entry === 'string' && entry.trim()
        ? Number(entry)
        : Number.NaN;

    if (Number.isFinite(numericId)) {
      ids.push(numericId);
    }

    return ids;
  }, []);
};

const readNumericId = (value: unknown) => {
  const numericId = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(numericId) ? numericId : null;
};

const normalizeCreateResponse = (body: unknown) => {
  const message = readMessage(body, 'Department request completed.');
  const isSuccess = !isRecord(body) || body.status !== false;
  const data = isRecord(body) && isRecord(body.data) ? body.data : null;
  const mappedDepartment = data ? mapDepartmentRecord(data) : null;

  return {
    success: isSuccess,
    message,
    ...(mappedDepartment ? { department: mappedDepartment, counter: mapDepartmentToCounter(mappedDepartment) } : {}),
  };
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { success: false, message: 'Invalid department request payload.' },
      { status: 400 },
    );
  }

  if (!isRecord(payload) || payload.action !== 'create') {
    return Response.json(
      { success: false, message: 'Unsupported department action.' },
      { status: 400 },
    );
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const remark = typeof payload.remark === 'string' ? payload.remark.trim() : '';
  const accountIds = readNumericIds(payload.accountIds);
  const defaultAccountId = readNumericId(payload.defaultAccountId);

  if (!name) {
    return Response.json(
      { success: false, message: 'Department name is required.' },
      { status: 400 },
    );
  }

  if (accountIds.length === 0) {
    return Response.json(
      { success: false, message: 'Please select at least one bank account' },
      { status: 400 },
    );
  }

  if (defaultAccountId === null) {
    return Response.json(
      { success: false, message: 'Please select a default bank account' },
      { status: 400 },
    );
  }

  if (!accountIds.includes(defaultAccountId)) {
    return Response.json(
      { success: false, message: 'Default account must be one of the linked accounts' },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value?.trim();

  if (!token) {
    return Response.json(
      { success: false, message: 'No auth token cookie is available for the create department request.' },
      { status: 401 },
    );
  }

  try {
    const response = await requestBackendJson('departmentCreate', token, {
      name,
      ...(remark ? { remark } : {}),
      account_ids: accountIds,
      default_account_id: defaultAccountId,
    });
    const normalizedBody = normalizeCreateResponse(response.body);
    const responseStatus = response.statusCode >= 400 || !normalizedBody.success
      ? response.statusCode >= 400 ? response.statusCode : 400
      : response.statusCode;

    return Response.json(normalizedBody, { status: responseStatus });
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      return Response.json(
        { success: false, message: error.message },
        { status: error.statusCode },
      );
    }

    return Response.json(
      { success: false, message: 'Unable to reach the create department service right now.' },
      { status: 502 },
    );
  }
}
