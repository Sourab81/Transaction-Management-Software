import {
  backendFetch,
  BackendFetchError,
} from '../../../../lib/api/backendFetch';
import { isRecord, readJoinedMessage } from '../../../../lib/mappers/legacy-record';

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
  if (isRecord(body)) return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
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

const buildColorPayload = (payload: Record<string, unknown>) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const hexCode = typeof payload.hexCode === 'string'
    ? payload.hexCode.trim()
    : typeof payload.hex_code === 'string'
      ? payload.hex_code.trim()
      : '';

  if (!name) {
    return Response.json({ success: false, message: 'Color name is required.' }, { status: 400 });
  }

  if (!hexCode) {
    return Response.json({ success: false, message: 'Color is required.' }, { status: 400 });
  }

  return {
    name,
    color_code: hexCode.startsWith('#') ? hexCode.toUpperCase() : `#${hexCode}`.toUpperCase(),
    remark: typeof payload.remark === 'string' ? payload.remark.trim() : null,
    status: payload.status === 'Inactive' || payload.status === 0 || payload.status === '0' ? 0 : 1,
  };
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    return Response.json(await backendFetch(`customer-colors/${encodeURIComponent(id)}`, { method: 'GET' }));
  } catch (error) {
    return errorResponse(error, 'Unable to load customer color.');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid customer color payload.' }, { status: 400 });
  }

  const body = buildColorPayload(payload);
  if (body instanceof Response) return body;

  try {
    return Response.json(await backendFetch(`customer-colors/${encodeURIComponent(id)}`, { method: 'PUT', body }));
  } catch (error) {
    return errorResponse(error, 'Unable to update customer color.');
  }
}
