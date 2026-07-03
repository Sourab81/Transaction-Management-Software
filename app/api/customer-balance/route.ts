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

const errorResponse = (error: unknown, fallbackMessage = 'Unable to process customer balance request.') => {
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

const readRequiredId = (
  payload: Record<string, unknown>,
  keys: string[],
  label: string,
) => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }

  return Response.json({ success: false, message: `${label} is required.` }, { status: 400 });
};

const readRequiredNumber = (
  payload: Record<string, unknown>,
  keys: string[],
  label: string,
) => {
  for (const key of keys) {
    const value = payload[key];
    const numericValue = typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;

    if (Number.isFinite(numericValue) && numericValue !== 0) {
      return numericValue;
    }
  }

  return Response.json({ success: false, message: `${label} cannot be 0.` }, { status: 400 });
};

const buildListPayload = (payload: Record<string, unknown>) => {
  const backendPayload: Record<string, unknown> = {
    page_no: 1,
    limit: 10,
    status: 1,
  };

  addOptionalField(backendPayload, 'page_no', payload, ['pageNo', 'page_no']);
  addOptionalField(backendPayload, 'limit', payload, ['limit']);
  addOptionalField(backendPayload, 'status', payload, ['status']);
  addOptionalField(backendPayload, 'customer_id', payload, ['customerId', 'customer_id']);

  return backendPayload;
};

const buildPayPayload = (payload: Record<string, unknown>) => {
  const customerId = readRequiredId(payload, ['customerId', 'customer_id'], 'Customer');
  if (customerId instanceof Response) return customerId;

  const amount = readRequiredNumber(payload, ['amount', 'paymentAmount', 'payment_amount'], 'Payment amount');
  if (amount instanceof Response) return amount;

  const paymentMode = readRequiredId(payload, ['paymentMode', 'payment_mode'], 'Payment mode');
  if (paymentMode instanceof Response) return paymentMode;

  const backendPayload: Record<string, unknown> = {
    customer_id: customerId,
    payment_amount: amount,
    payment_mode: paymentMode,
  };

  addOptionalField(backendPayload, 'account_id', payload, ['accountId', 'account_id']);
  addOptionalField(backendPayload, 'counter_id', payload, ['counterId', 'counter_id']);
  addOptionalField(backendPayload, 'payment_date', payload, ['paymentDate', 'payment_date', 'date']);
  addOptionalField(backendPayload, 'remark', payload, ['remark']);

  return backendPayload;
};

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid customer balance request payload.' }, { status: 400 });
  }

  const action = typeof payload.action === 'string' ? payload.action : 'list';
  const endpointByAction: Record<string, string> = {
    list: 'getCustomerBalance',
    pay: 'payCustomerBalance',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json({ success: false, message: 'Unsupported customer balance action.' }, { status: 400 });
  }

  const backendPayload = action === 'pay'
    ? buildPayPayload(payload)
    : buildListPayload(payload);

  if (backendPayload instanceof Response) return backendPayload;

  try {
    // Token is httpOnly, so balance requests go through this server route.
    return Response.json(await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    }));
  } catch (error) {
    return errorResponse(error, `Unable to ${action} customer balance.`);
  }
}
