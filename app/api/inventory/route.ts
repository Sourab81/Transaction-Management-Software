import {
  backendFetch,
  BackendFetchError,
} from '../../../lib/api/backendFetch';
import { isRecord, readJoinedMessage } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const validInventoryTypes = new Set(['service', 'product']);

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

const errorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof BackendFetchError) {
    const message = readBackendMessage(error.body, error.message || fallbackMessage);

    return Response.json(
      { success: false, message },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json(
    { success: false, message: fallbackMessage },
    { status: 502 },
  );
};

const readRequiredId = (payload: Record<string, unknown>, label = 'Inventory item id') => {
  const value = payload.id;

  if ((typeof value === 'string' && value.trim()) || typeof value === 'number') {
    return String(value).trim();
  }

  return Response.json(
    { success: false, message: `${label} is required.` },
    { status: 400 },
  );
};

const readRequiredName = (payload: Record<string, unknown>) => {
  if (typeof payload.name === 'string' && payload.name.trim()) {
    return payload.name.trim();
  }

  return Response.json(
    { success: false, message: 'Inventory name is required.' },
    { status: 400 },
  );
};

const readInventoryType = (value: unknown, required: boolean) => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return required
      ? Response.json(
          { success: false, message: 'Inventory type is required.' },
          { status: 400 },
        )
      : undefined;
  }

  if (typeof value === 'string' && validInventoryTypes.has(value)) {
    return value;
  }

  return Response.json(
    { success: false, message: 'Inventory type must be service or product.' },
    { status: 400 },
  );
};

const readNonNegativeNumber = (value: unknown, label: string, required: boolean) => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return required
      ? Response.json(
          { success: false, message: `${label} must be a zero or positive number.` },
          { status: 400 },
        )
      : undefined;
  }

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

const readOptionalStatus = (value: unknown) => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  const numericStatus = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : Number.NaN;

  if (numericStatus === 0 || numericStatus === 1) {
    return numericStatus;
  }

  return Response.json(
    { success: false, message: 'Status must be 0 or 1.' },
    { status: 400 },
  );
};

const readOptionalId = (value: unknown, label: string) => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  if ((typeof value === 'string' && value.trim()) || typeof value === 'number') {
    return String(value).trim();
  }

  return Response.json(
    { success: false, message: `${label} must be a valid id.` },
    { status: 400 },
  );
};

const addOptionalNumberField = (
  backendPayload: Record<string, unknown>,
  backendKey: string,
  payload: Record<string, unknown>,
  keys: string[],
) => {
  for (const key of keys) {
    if (typeof payload[key] === 'undefined' || payload[key] === null || payload[key] === '') continue;

    const value = readNonNegativeNumber(payload[key], backendKey, false);
    if (value instanceof Response) return value;
    if (typeof value !== 'undefined') backendPayload[backendKey] = value;
    return undefined;
  }

  return undefined;
};

const buildInventoryQuery = (request: Request) => {
  const source = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  const counterId = source.get('counter_id')?.trim();

  if (!counterId) {
    return Response.json(
      { success: false, message: 'Please select a department to view inventory.' },
      { status: 400 },
    );
  }

  params.set('counter_id', counterId);

  ['type', 'status', 'search'].forEach((key) => {
    const value = source.get(key);
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  });

  const query = params.toString();
  return query ? `getInventory?${query}` : 'getInventory';
};

export async function GET(request: Request) {
  const endpoint = buildInventoryQuery(request);
  if (endpoint instanceof Response) return endpoint;

  try {
    return Response.json(await backendFetch(endpoint));
  } catch (error) {
    return errorResponse(error, 'Unable to load inventory from the backend.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);

  if (!isRecord(payload)) {
    return Response.json(
      { success: false, message: 'Invalid inventory request payload.' },
      { status: 400 },
    );
  }

  const action = typeof payload.action === 'string' ? payload.action : '';
  const endpointByAction: Record<string, string> = {
    create: 'createInventory',
    update: 'updateInventory',
    delete: 'deleteInventory',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json(
      { success: false, message: 'Unsupported inventory action.' },
      { status: 400 },
    );
  }

  const backendPayload: Record<string, unknown> = {};

  if (action === 'delete') {
    const id = readRequiredId(payload);
    if (id instanceof Response) return id;
    backendPayload.id = id;
  }

  if (action === 'create' || action === 'update') {
    if (action === 'update') {
      const id = readRequiredId(payload);
      if (id instanceof Response) return id;
      backendPayload.id = id;
    }

    const name = action === 'create'
      ? readRequiredName(payload)
      : typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim()
        : undefined;
    if (name instanceof Response) return name;
    if (typeof name !== 'undefined') backendPayload.name = name;

    const type = readInventoryType(payload.type, action === 'create');
    if (type instanceof Response) return type;
    if (typeof type !== 'undefined') backendPayload.type = type;

    const quantity = readNonNegativeNumber(payload.quantity, 'Quantity', action === 'create');
    if (quantity instanceof Response) return quantity;
    if (typeof quantity !== 'undefined') backendPayload.quantity = quantity;

    const openingStock = addOptionalNumberField(backendPayload, 'opening_stock', payload, ['openingStock', 'opening_stock']);
    if (openingStock instanceof Response) return openingStock;

    const currentStock = addOptionalNumberField(backendPayload, 'current_stock', payload, ['currentStock', 'current_stock']);
    if (currentStock instanceof Response) return currentStock;

    const lowStockThreshold = addOptionalNumberField(backendPayload, 'low_stock_threshold', payload, ['lowStockThreshold', 'low_stock_threshold']);
    if (lowStockThreshold instanceof Response) return lowStockThreshold;

    const counterId = action === 'create'
      ? readOptionalId(payload.counterId ?? payload.counter_id, 'Counter')
      : readOptionalId(payload.counterId ?? payload.counter_id, 'Counter');
    if (counterId instanceof Response) return counterId;
    if (action === 'create' && typeof counterId === 'undefined') {
      return Response.json(
        { success: false, message: 'Counter is required.' },
        { status: 400 },
      );
    }
    if (typeof counterId !== 'undefined') backendPayload.counter_id = counterId;

    const status = readOptionalStatus(payload.status);
    if (status instanceof Response) return status;
    if (typeof status !== 'undefined') backendPayload.status = status;

    if (typeof payload.remark === 'string') {
      backendPayload.remark = payload.remark.trim();
    } else if (payload.remark === null) {
      backendPayload.remark = null;
    }
  }

  try {
    return Response.json(await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    }));
  } catch (error) {
    return errorResponse(error, 'Unable to save inventory in the backend.');
  }
}
