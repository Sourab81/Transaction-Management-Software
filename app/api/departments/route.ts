import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import { isRecord } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const readPayload = async (request: Request) => {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
};

const readRequiredName = (payload: Record<string, unknown>) => {
  if (typeof payload.name === 'string' && payload.name.trim()) {
    return payload.name.trim();
  }

  return Response.json(
    { success: false, message: 'Department name is required.' },
    { status: 400 },
  );
};

const readRequiredNonNegativeNumber = (
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

    if (Number.isFinite(numericValue) && numericValue >= 0) {
      return numericValue;
    }
  }

  return Response.json(
    { success: false, message: `${label} must be a zero or positive number.` },
    { status: 400 },
  );
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
    // Departments are called "Counters" in the backend.
    // Token is httpOnly, so this server route calls CodeIgniter through backendFetch.
    const payload = await backendFetch('getCounters');
    return Response.json(payload);
  } catch (error) {
    return errorResponse(error, 'Unable to load departments from the backend.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);

  if (!isRecord(payload)) {
    return Response.json(
      { success: false, message: 'Invalid department request payload.' },
      { status: 400 },
    );
  }

  const action = typeof payload.action === 'string' ? payload.action : '';
  if (action !== 'create') {
    return Response.json(
      { success: false, message: 'Unsupported department action.' },
      { status: 400 },
    );
  }

  const name = readRequiredName(payload);
  if (name instanceof Response) {
    return name;
  }

  const openingBalance = readRequiredNonNegativeNumber(payload, ['openingBalance', 'opening_balance'], 'Opening balance');
  if (openingBalance instanceof Response) {
    return openingBalance;
  }

  try {
    const responsePayload = await backendFetch('createCounter', {
      method: 'POST',
      body: {
        name,
        opening_balance: openingBalance,
        remark: typeof payload.remark === 'string' ? payload.remark : '',
      },
    });

    return Response.json(responsePayload);
  } catch (error) {
    return errorResponse(error, 'Unable to create department in the backend.');
  }
}
