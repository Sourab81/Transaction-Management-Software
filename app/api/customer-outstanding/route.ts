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
  if (typeof body === 'string' && body.trim()) return body.trim();

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

const buildListPayload = (payload: Record<string, unknown>) => ({
  page_no: payload.pageNo ?? payload.page_no ?? 1,
  limit: payload.limit ?? 10,
  status: payload.status ?? 1,
  ...(typeof payload.customerId !== 'undefined' ? { customer_id: payload.customerId } : {}),
});

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid customer outstanding request payload.' }, { status: 400 });
  }

  try {
    // Token is httpOnly, so outstanding requests go through this local server route.
    const backendResponse = await backendFetch('getCustomerOutstanding', {
      method: 'POST',
      body: buildListPayload(payload),
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Customers Outstanding][API Route] Raw backend response:', backendResponse);
    }
    return Response.json(backendResponse);
  } catch (error) {
    if (error instanceof BackendFetchError && (error.statusCode === 404 || error.statusCode === 501)) {
      return Response.json(await backendFetch('getCustomerBalance', {
        method: 'POST',
        body: buildListPayload(payload),
      }));
    }

    if (error instanceof BackendFetchError) {
      return Response.json(
        { success: false, message: readBackendMessage(error.body, error.message || 'Unable to load customer outstanding records.') },
        { status: error.statusCode ?? 502 },
      );
    }

    return Response.json({ success: false, message: 'Unable to load customer outstanding records.' }, { status: 502 });
  }
}
