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
    const trimmedBody = body.trim();
    const looksLikeHtml = /<!doctype html|<html|<body|<h1/i.test(trimmedBody);
    return looksLikeHtml ? fallbackMessage : trimmedBody;
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

const errorResponse = (error: unknown, fallbackMessage = 'Unable to process expense type request.') => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      { success: false, message: readBackendMessage(error.body, fallbackMessage) || error.message || fallbackMessage },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json({ success: false, message: fallbackMessage }, { status: 502 });
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

const buildMutationPayload = (payload: Record<string, unknown>, includeId = false) => {
  const name = readRequiredString(payload, ['name', 'expenseTypeName', 'expense_type_name', 'categoryName', 'category_name'], 'Expense type name');
  if (name instanceof Response) return name;

  const backendPayload: Record<string, unknown> = {
    expense_type_name: name,
    name,
  };

  if (includeId) {
    const id = readRequiredString(payload, ['id', 'expenseTypeId', 'expense_type_id', 'categoryId', 'category_id'], 'Expense type');
    if (id instanceof Response) return id;
    backendPayload.id = id;
    backendPayload.expense_type_id = id;
  }

  if (typeof payload.status !== 'undefined') {
    backendPayload.status = payload.status;
  }

  if (typeof payload.remark === 'string') {
    backendPayload.remark = payload.remark.trim();
  } else if (payload.remark === null) {
    backendPayload.remark = null;
  }

  return backendPayload;
};

const buildDeletePayload = (payload: Record<string, unknown>) => {
  const id = readRequiredString(payload, ['id', 'expenseTypeId', 'expense_type_id', 'categoryId', 'category_id'], 'Expense type');
  if (id instanceof Response) return id;

  return {
    id,
    expense_type_id: id,
    status: 0,
  };
};

const logBackendRequest = (endpoint: string, payload: unknown) => {
  console.log('Expense Type Payload:', payload);
  console.log('Request URL:', endpoint);
};

export async function GET() {
  const endpoint = 'expense-types?status=1&page_no=1&limit=500';
  logBackendRequest(endpoint, null);

  try {
    const data = await backendFetch(endpoint, { method: 'GET' });
    console.log('Response Data:', data);
    return Response.json(data);
  } catch (error) {
    return errorResponse(error, 'Unable to load expense types.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid expense type request payload.' }, { status: 400 });
  }

  const action = typeof payload.action === 'string' ? payload.action : 'create';
  const endpointByAction: Record<string, string> = {
    create: 'createExpenseType',
    update: 'updateExpenseType',
    delete: 'changeExpenseTypeStatus',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json({ success: false, message: 'Unsupported expense type action.' }, { status: 400 });
  }

  const backendPayload = action === 'create'
    ? buildMutationPayload(payload)
    : action === 'update'
      ? buildMutationPayload(payload, true)
      : buildDeletePayload(payload);

  if (backendPayload instanceof Response) return backendPayload;
  logBackendRequest(endpoint, backendPayload);

  try {
    const data = await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    });
    console.log('Response Data:', data);
    return Response.json(data);
  } catch (error) {
    return errorResponse(error, `Unable to ${action} expense type.`);
  }
}
