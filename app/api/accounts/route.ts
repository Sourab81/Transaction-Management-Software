import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import { isRecord } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const toBodyValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

const readRequiredValue = (
  payload: Record<string, unknown>,
  key: string,
  label: string,
) => {
  const value = payload[key];

  if ((typeof value === 'string' && value.trim()) || typeof value === 'number') {
    return value;
  }

  return Response.json(
    { success: false, message: `${label} is required.` },
    { status: 400 },
  );
};

const readRequiredNonNegativeNumber = (
  payload: Record<string, unknown>,
  key: string,
  label: string,
) => {
  const value = payload[key];
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : Number.NaN;

  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return Response.json(
    { success: false, message: `${label} must be a zero or positive number.` },
    { status: 400 },
  );
};

const readRequiredId = (
  payload: Record<string, unknown>,
  key: string,
  label: string,
) => {
  const value = payload[key];

  if ((typeof value === 'string' && value.trim()) || typeof value === 'number') {
    return String(value).trim();
  }

  return Response.json(
    { success: false, message: `${label} is required.` },
    { status: 400 },
  );
};

const readPayload = async (request: Request) => {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
};

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

export async function GET() {
  try {
    // Token is httpOnly, so account backend calls must happen in this server route.
    const payload = await backendFetch('getAccounts');
    return Response.json(payload);
  } catch (error) {
    return errorResponse(error, 'Unable to load accounts from the backend.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json(
      { message: 'Invalid account request payload.' },
      { status: 400 },
    );
  }

  const action = typeof payload.action === 'string' ? payload.action : '';

  if (action === 'create') {
    const accountHolder = readRequiredValue(payload, 'acc_holder', 'Account holder');
    const bankName = readRequiredValue(payload, 'bank_name', 'Bank name');
    const accountNumber = readRequiredValue(payload, 'acc_no', 'Account number');
    const ifscCode = readRequiredValue(payload, 'ifsc_code', 'IFSC code');
    const openingBalance = readRequiredNonNegativeNumber(payload, 'opening_balance', 'Opening balance');
    const invalidResponse = [
      accountHolder,
      bankName,
      accountNumber,
      ifscCode,
      openingBalance,
    ].find((value): value is Response => value instanceof Response);

    if (invalidResponse) {
      return invalidResponse;
    }

    try {
      // Frontend calls this local route instead of CodeIgniter directly.
      const responsePayload = await backendFetch('createAccount', {
        method: 'POST',
        body: {
          acc_holder: accountHolder,
          bank_name: bankName,
          acc_no: accountNumber,
          ifsc_code: ifscCode,
          branch: toBodyValue(payload.branch),
          opening_balance: openingBalance,
          remark: toBodyValue(payload.remark),
          status: toBodyValue(payload.status),
        },
      });

      return Response.json(responsePayload);
    } catch (error) {
      return errorResponse(error, 'Unable to create account in the backend.');
    }
  }

  if (action === 'delete') {
    const id = readRequiredId(payload, 'id', 'Account id');
    if (id instanceof Response) {
      return id;
    }

    try {
      const responsePayload = await backendFetch('deleteAccount', {
        method: 'POST',
        body: {
          id,
        },
      });

      return Response.json(responsePayload);
    } catch (error) {
      return errorResponse(error, 'Unable to delete account in the backend.');
    }
  }

  return Response.json(
    { message: 'Unsupported account action.' },
    { status: 400 },
  );
}
