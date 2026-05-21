import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
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
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

const errorResponse = (error: unknown, fallbackMessage = 'Unable to process customer request.') => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      { success: false, message: readBackendMessage(error.body, error.message || fallbackMessage) },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json({ success: false, message: fallbackMessage }, { status: 502 });
};

const appendFilters = (request: Request) => {
  const requestUrl = new URL(request.url);
  const params = new URLSearchParams();

  ['search', 'status'].forEach((key) => {
    const value = requestUrl.searchParams.get(key);
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `getCustomers?${query}` : 'getCustomers';
};

const readRequiredString = (payload: Record<string, unknown>, keys: string[], label: string) => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return Response.json({ success: false, message: `${label} is required.` }, { status: 400 });
};

const readRequiredId = (payload: Record<string, unknown>) => {
  const id = payload.id ?? payload.customerId ?? payload.customer_id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (typeof id === 'number' && Number.isFinite(id)) return id;

  return Response.json({ success: false, message: 'Customer id is required.' }, { status: 400 });
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

const buildCustomerMutationPayload = (
  action: 'create' | 'update',
  payload: Record<string, unknown>,
) => {
  const backendPayload: Record<string, unknown> = {};

  if (action === 'update') {
    const id = readRequiredId(payload);
    if (id instanceof Response) return id;
    backendPayload.id = id;
    backendPayload.customer_id = id;
  }

  const customerName = action === 'create'
    ? readRequiredString(payload, ['customerName', 'customer_name', 'name'], 'Customer name')
    : payload.customerName ?? payload.customer_name ?? payload.name;
  if (customerName instanceof Response) return customerName;
  if (typeof customerName === 'string' && customerName.trim()) {
    backendPayload.customer_name = customerName.trim();
  }

  const mobileNo = action === 'create'
    ? readRequiredString(payload, ['mobileNo', 'mobile_no', 'phone'], 'Mobile number')
    : payload.mobileNo ?? payload.mobile_no ?? payload.phone;
  if (mobileNo instanceof Response) return mobileNo;
  if (typeof mobileNo === 'string' && mobileNo.trim()) {
    backendPayload.mobile_no = mobileNo.trim();
  }

  addOptionalField(backendPayload, 'email', payload, ['email']);
  addOptionalField(backendPayload, 'address', payload, ['address']);
  addOptionalField(backendPayload, 'remark', payload, ['remark']);

  return backendPayload;
};

export async function GET(request: Request) {
  try {
    // Token is httpOnly, so this local route calls the backend server-side.
    return Response.json(await backendFetch(appendFilters(request), { method: 'POST' }));
  } catch (error) {
    return errorResponse(error, 'Unable to load customers.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid customer request payload.' }, { status: 400 });
  }

  const action = typeof payload.action === 'string' ? payload.action : 'list';

  if (action === 'list') {
    try {
      return Response.json(await backendFetch('getCustomers', { method: 'POST' }));
    } catch (error) {
      return errorResponse(error, 'Unable to load customers.');
    }
  }

  const endpointByAction: Record<string, string> = {
    create: 'createCustomer',
    update: 'updateCustomer',
    delete: 'deleteCustomer',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json({ success: false, message: 'Unsupported customer action.' }, { status: 400 });
  }

  let backendPayload: Record<string, unknown> | Response;
  if (action === 'delete') {
    const id = readRequiredId(payload);
    if (id instanceof Response) return id;
    backendPayload = { id, customer_id: id };
  } else {
    // Backend uses snake_case; frontend uses camelCase.
    backendPayload = buildCustomerMutationPayload(action as 'create' | 'update', payload);
    if (backendPayload instanceof Response) return backendPayload;
  }

  try {
    return Response.json(await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    }));
  } catch (error) {
    return errorResponse(error, `Unable to ${action} customer.`);
  }
}
