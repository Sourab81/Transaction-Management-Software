import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import {
  isRecord,
  readJoinedMessage,
} from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const readPositiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const buildBusinessListPayload = (request: Request) => {
  const searchParams = new URL(request.url).searchParams;
  const page = readPositiveInteger(searchParams.get('page'), 1);
  const limit = readPositiveInteger(searchParams.get('limit'), 10);

  return {
    page_no: String(page),
    limit: String(limit),
    // Role 2 is the backend Business user role.
    role: '2',
  };
};

const buildBusinessListPayloadFromBody = (payload: unknown) => {
  const source = isRecord(payload) ? payload : {};

  return {
    page_no: String(readPositiveInteger(typeof source.page_no === 'string' ? source.page_no : null, 1)),
    limit: String(readPositiveInteger(typeof source.limit === 'string' ? source.limit : null, 10)),
    // Role 2 is the backend Business user role.
    role: '2',
  };
};

const normalizeResponseBody = (body: unknown, fallbackMessage: string) => {
  if (body === null || typeof body === 'undefined') {
    return { message: fallbackMessage };
  }

  if (typeof body === 'string') {
    return { message: body };
  }

  return body;
};

const readRequestPayload = async (request: Request) => {
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
    { message: `${label} is required.` },
    { status: 400 },
  );
};

const validateCreateBusinessUserPayload = (
  payload: Record<string, unknown>,
): Response | Record<string, unknown> => {
  const username = readRequiredString(payload, 'username', 'Username');
  const fullname = readRequiredString(payload, 'fullname', 'Full name');
  const email = readRequiredString(payload, 'email_id', 'Email');
  const contactNumber = readRequiredString(payload, 'contact_no', 'Contact number');
  const role = readRequiredString(payload, 'role', 'Role id');
  const permission = readRequiredString(payload, 'permission', 'Permission payload');
  const privileges = readRequiredString(payload, 'privileges', 'Privileges payload');
  const invalidResponse = [
    username,
    fullname,
    email,
    contactNumber,
    role,
    permission,
    privileges,
  ].find((value): value is Response => value instanceof Response);

  if (invalidResponse) {
    return invalidResponse;
  }

  return {
    ...payload,
    username: username as string,
    fullname: fullname as string,
    email_id: email as string,
    contact_no: contactNumber as string,
    role: role as string,
    permission: permission as string,
    privileges: privileges as string,
  };
};

const readErrorMessage = (body: unknown, fallback: string) => {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallback;
  }

  return fallback;
};

const backendErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      normalizeResponseBody(error.body, readErrorMessage(error.body, error.message || fallbackMessage)),
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json(
    { message: fallbackMessage },
    { status: 502 },
  );
};

export async function GET(request: Request) {
  try {
    // The auth token is httpOnly, so backend requests that need Authorization
    // must run server-side through backendFetch instead of browser fetch.
    const payload = await backendFetch('getUsers', {
      method: 'POST',
      bodyFormat: 'form',
      body: buildBusinessListPayload(request),
    });

    return Response.json(payload);
  } catch (error) {
    return backendErrorResponse(error, 'Unable to load business users from the backend.');
  }
}

export async function POST(request: Request) {
  const payload = await readRequestPayload(request);

  if (!isRecord(payload)) {
    return Response.json(
      { message: 'Invalid business user request payload.' },
      { status: 400 },
    );
  }

  const action = typeof payload.action === 'string' ? payload.action : 'list';

  try {
    if (action !== 'create') {
      // Frontend calls this local route instead of calling CodeIgniter directly.
      const listPayload = await backendFetch('getUsers', {
        method: 'POST',
        bodyFormat: 'form',
        body: buildBusinessListPayloadFromBody(payload),
      });

      return Response.json(listPayload);
    }

    const createPayload = validateCreateBusinessUserPayload(payload);
    if (createPayload instanceof Response) {
      return createPayload;
    }

    delete createPayload.action;
    // The auth token is httpOnly, so createUserByAdmin must be called from this
    // server route where backendFetch can read cookies().
    const responsePayload = await backendFetch('createUserByAdmin', {
      method: 'POST',
      bodyFormat: 'form',
      body: createPayload,
    });

    return Response.json(responsePayload);
  } catch (error) {
    return backendErrorResponse(error, 'Unable to create business user in the backend.');
  }
}
