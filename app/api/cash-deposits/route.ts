import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import { isRecord, readJoinedMessage } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const CASH_DEPOSIT_LIST_ENDPOINT = process.env.API_CASH_DEPOSIT_LIST_PATH || 'cashDeposits';
const CASH_DEPOSIT_CREATE_ENDPOINT = process.env.API_CASH_DEPOSIT_CREATE_PATH || 'cashDeposit';

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

const readPayload = async (request: Request) => {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
};

const readRequiredId = (
  payload: Record<string, unknown>,
  keys: string[],
  label: string,
) => {
  for (const key of keys) {
    const value = payload[key];

    if ((typeof value === 'string' && value.trim()) || typeof value === 'number') {
      return String(value).trim();
    }
  }

  return Response.json(
    { success: false, message: `${label} is required.` },
    { status: 400 },
  );
};

const readPositiveAmount = (payload: Record<string, unknown>) => {
  const value = payload.amount;
  const amount = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : Number.NaN;

  if (Number.isFinite(amount) && amount > 0) {
    return amount;
  }

  return Response.json(
    { success: false, message: 'Amount must be greater than 0.' },
    { status: 400 },
  );
};

const readBackendMessage = (body: unknown, fallbackMessage: string) => {
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (isRecord(body)) return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  return fallbackMessage;
};

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const params = new URLSearchParams();

  ['date', 'page_no', 'limit', 'status'].forEach((key) => {
    const value = source.get(key);
    if (value?.trim()) params.set(key, value.trim());
  });

  const query = params.toString();
  const endpoint = query ? `${CASH_DEPOSIT_LIST_ENDPOINT}?${query}` : CASH_DEPOSIT_LIST_ENDPOINT;

  try {
    return Response.json(await backendFetch(endpoint));
  } catch (error) {
    return errorResponse(error, 'Unable to load cash deposits from the backend.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);

  if (!isRecord(payload)) {
    return Response.json(
      { success: false, message: 'Invalid cash deposit request payload.' },
      { status: 400 },
    );
  }

  const accountId = readRequiredId(payload, ['accountId', 'account_id'], 'Bank account');
  if (accountId instanceof Response) return accountId;

  const amount = readPositiveAmount(payload);
  if (amount instanceof Response) return amount;

  const departmentId = readRequiredId(payload, ['departmentId', 'department_id', 'counterId', 'counter_id'], 'Current department');
  if (departmentId instanceof Response) return departmentId;

  try {
    return Response.json(await backendFetch(CASH_DEPOSIT_CREATE_ENDPOINT, {
      method: 'POST',
      body: {
        account_id: accountId,
        amount,
        department_id: departmentId,
        counter_id: departmentId,
        remark: typeof payload.remark === 'string' ? payload.remark.trim() : null,
      },
    }));
  } catch (error) {
    if (error instanceof BackendFetchError) {
      return Response.json(
        { success: false, message: readBackendMessage(error.body, error.message || 'Unable to save cash deposit.') },
        { status: error.statusCode ?? 502 },
      );
    }

    return errorResponse(error, 'Unable to save cash deposit.');
  }
}
