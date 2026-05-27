import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import { buildEmployeePermissionsPayload } from '../../../lib/mappers/employee-permission-payload';
import { isRecord, readJoinedMessage } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const readPayload = async (request: Request) => {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
};

const readBackendMessage = (body: unknown, fallbackMessage: string) => {
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }
  return fallbackMessage;
};

const errorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      { success: false, message: readBackendMessage(error.body, error.message || fallbackMessage) },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json({ success: false, message: fallbackMessage }, { status: 502 });
};

const addOptionalField = (
  backendPayload: Record<string, unknown>,
  backendKey: string,
  payload: Record<string, unknown>,
  keys: string[],
) => {
  for (const key of keys) {
    if (typeof payload[key] !== 'undefined') {
      const value = payload[key];
      backendPayload[backendKey] = typeof value === 'string' ? value.trim() : value;
      return;
    }
  }
};

const readRequiredString = (
  payload: Record<string, unknown>,
  keys: string[],
  label: string,
) => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return Response.json({ success: false, message: `${label} is required.` }, { status: 400 });
};

const readRequiredId = (
  payload: Record<string, unknown>,
  keys: string[],
  label: string,
) => readRequiredString(payload, keys, label);

const readPermissions = (payload: Record<string, unknown>) => {
  const permissions = buildEmployeePermissionsPayload(payload.permissions ?? payload.privileges);
  if (Object.keys(permissions).length > 0) return permissions;

  return Response.json({ success: false, message: 'Permissions are required.' }, { status: 400 });
};

const buildListPayload = (payload: Record<string, unknown>) => {
  const backendPayload: Record<string, unknown> = {
    page_no: payload.pageNo ?? payload.page_no ?? 1,
    limit: payload.limit ?? 100,
    status: payload.status ?? 1,
  };

  addOptionalField(backendPayload, 'search', payload, ['search']);
  return backendPayload;
};

const buildListPayloadFromUrl = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const payload: Record<string, unknown> = {};
  searchParams.forEach((value, key) => {
    payload[key] = value;
  });
  return buildListPayload(payload);
};

const buildEmployeePayload = (
  payload: Record<string, unknown>,
  options: { requirePassword: boolean; includeId?: boolean },
) => {
  const backendPayload: Record<string, unknown> = {};

  if (options.includeId) {
    const id = readRequiredId(payload, ['id', 'employeeId', 'employee_id'], 'Employee');
    if (id instanceof Response) return id;
    backendPayload.id = id;
    backendPayload.employee_id = id;
  }

  const fullName = readRequiredString(payload, ['fullName', 'fullname', 'full_name'], 'Full name');
  if (fullName instanceof Response) return fullName;

  const nickName = readRequiredString(payload, ['nickName', 'nickname', 'nick_name'], 'Nick name');
  if (nickName instanceof Response) return nickName;

  const mobile = readRequiredString(payload, ['mobile', 'contact_no', 'contactNo', 'phone'], 'Mobile');
  if (mobile instanceof Response) return mobile;

  const email = readRequiredString(payload, ['email', 'email_id', 'emailId'], 'Email');
  if (email instanceof Response) return email;

  if (options.requirePassword) {
    const password = readRequiredString(payload, ['password'], 'Password');
    if (password instanceof Response) return password;
    backendPayload.password = password;
  } else {
    addOptionalField(backendPayload, 'password', payload, ['password']);
  }

  const permissions = readPermissions(payload);
  if (permissions instanceof Response) return permissions;

  backendPayload.fullname = fullName;
  backendPayload.nickname = nickName;
  backendPayload.contact_no = mobile;
  backendPayload.email_id = email;
  backendPayload.permissions = permissions;

  addOptionalField(backendPayload, 'gender', payload, ['gender']);
  addOptionalField(backendPayload, 'dob', payload, ['dob']);
  addOptionalField(backendPayload, 'address', payload, ['address']);
  addOptionalField(backendPayload, 'remark', payload, ['remark']);
  addOptionalField(backendPayload, 'status', payload, ['status']);

  return backendPayload;
};

export async function GET(request: Request) {
  try {
    return Response.json(await backendFetch('getEmployees', {
      method: 'POST',
      body: buildListPayloadFromUrl(request),
    }));
  } catch (error) {
    return errorResponse(error, 'Unable to list employees.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid employee request payload.' }, { status: 400 });
  }

  const action = typeof payload.action === 'string' ? payload.action : 'list';
  const endpointByAction: Record<string, string> = {
    list: 'getEmployees',
    create: 'createEmployee',
    update: 'updateEmployee',
    delete: 'deleteEmployee',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json({ success: false, message: 'Unsupported employee action.' }, { status: 400 });
  }

  const backendPayload = action === 'list'
    ? buildListPayload(payload)
    : action === 'create'
      ? buildEmployeePayload(payload, { requirePassword: true })
      : action === 'update'
        ? buildEmployeePayload(payload, { requirePassword: false, includeId: true })
        : (() => {
            const id = readRequiredId(payload, ['id', 'employeeId', 'employee_id'], 'Employee');
            return id instanceof Response ? id : { id, employee_id: id };
          })();

  if (backendPayload instanceof Response) return backendPayload;

  try {
    // Token is httpOnly, so this local route calls CodeIgniter server-side.
    if (action === 'create') {
      console.log('Employee API route create payload', backendPayload);
    }

    const backendResponse = await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    });

    if (action === 'create') {
      console.log('Employee API route create response', backendResponse);
    }

    return Response.json(backendResponse);
  } catch (error) {
    return errorResponse(error, `Unable to ${action} employee.`);
  }
}
