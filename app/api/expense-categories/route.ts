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

const errorResponse = (error: unknown, fallbackMessage = 'Unable to process expense category request.') => {
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
  const name = readRequiredString(payload, ['name', 'categoryName', 'category_name'], 'Category name');
  if (name instanceof Response) return name;

  const backendPayload: Record<string, unknown> = {
    name,
    category_name: name,
  };

  if (includeId) {
    const id = readRequiredString(payload, ['id', 'categoryId', 'category_id'], 'Category');
    if (id instanceof Response) return id;
    backendPayload.id = id;
    backendPayload.category_id = id;
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

export async function GET() {
  try {
    // Token is httpOnly, so category backend calls must happen from this route.
    return Response.json(await backendFetch('getExpenseCategories', {
      method: 'POST',
      body: {},
    }));
  } catch (error) {
    return errorResponse(error, 'Unable to load expense categories.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid expense category request payload.' }, { status: 400 });
  }

  const action = typeof payload.action === 'string' ? payload.action : 'create';
  const endpointByAction: Record<string, string> = {
    create: 'createExpenseCategory',
    update: 'updateExpenseCategory',
    delete: 'deleteExpenseCategory',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json({ success: false, message: 'Unsupported expense category action.' }, { status: 400 });
  }

  const backendPayload = action === 'create'
    ? buildMutationPayload(payload)
    : action === 'update'
      ? buildMutationPayload(payload, true)
      : (() => {
          const id = readRequiredString(payload, ['id', 'categoryId', 'category_id'], 'Category');
          return id instanceof Response ? id : { id, category_id: id };
        })();

  if (backendPayload instanceof Response) return backendPayload;

  try {
    return Response.json(await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    }));
  } catch (error) {
    return errorResponse(error, `Unable to ${action} expense category.`);
  }
}
