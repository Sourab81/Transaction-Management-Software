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

const errorResponse = (error: unknown, fallbackMessage = 'Unable to process expense request.') => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      { success: false, message: readBackendMessage(error.body, fallbackMessage) || error.message || fallbackMessage },
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

    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return Response.json({ success: false, message: `${label} must be greater than 0.` }, { status: 400 });
};

const buildListPayload = (payload: Record<string, unknown>) => {
  const backendPayload: Record<string, unknown> = {
    page_no: payload.pageNo ?? payload.page_no ?? 1,
    limit: payload.limit ?? 10,
    status: payload.status ?? 1,
  };

  addOptionalField(backendPayload, 'counter_id', payload, ['counterId', 'counter_id']);
  addOptionalField(backendPayload, 'payment_mode', payload, ['paymentMode', 'payment_mode']);
  if (backendPayload.payment_mode === 'department') {
    backendPayload.payment_mode = 'cash';
  }
  addOptionalField(backendPayload, 'account_id', payload, ['accountId', 'account_id']);
  addOptionalField(backendPayload, 'staff_id', payload, ['staffId', 'staff_id']);
  addOptionalField(backendPayload, 'category_id', payload, ['categoryId', 'category_id']);
  addOptionalField(backendPayload, 'date_from', payload, ['dateFrom', 'date_from']);
  addOptionalField(backendPayload, 'date_to', payload, ['dateTo', 'date_to']);
  addOptionalField(backendPayload, 'search', payload, ['search']);

  return backendPayload;
};

const buildMutationPayload = (
  payload: Record<string, unknown>,
  options: { includeId?: boolean } = {},
) => {
  const category = readRequiredString(payload, ['category', 'categoryName', 'category_name'], 'Expense category');
  if (category instanceof Response) return category;
  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim()
    : typeof payload.expense_title === 'string' && payload.expense_title.trim()
      ? payload.expense_title.trim()
      : category;

  const counterId = readRequiredString(payload, ['counterId', 'counter_id'], 'Department');
  if (counterId instanceof Response) return counterId;

  const paymentMode = readRequiredString(payload, ['paymentMode', 'payment_mode'], 'Payment mode');
  if (paymentMode instanceof Response) return paymentMode;

  const amount = readRequiredNumber(payload, ['amount'], 'Amount');
  if (amount instanceof Response) return amount;

  const normalizedPaymentMode = String(paymentMode).trim().toLowerCase();
  if (normalizedPaymentMode === 'account') {
    const accountId = readRequiredString(payload, ['accountId', 'account_id'], 'Account');
    if (accountId instanceof Response) return accountId;
  }

  const backendPaymentMode = normalizedPaymentMode === 'department' ? 'cash' : normalizedPaymentMode;
  const backendPayload: Record<string, unknown> = {
    title,
    expense_title: title,
    category,
    amount,
    payment_mode: backendPaymentMode,
    counter_id: counterId,
  };

  if (options.includeId) {
    const id = readRequiredString(payload, ['id', 'expenseId', 'expense_id'], 'Expense');
    if (id instanceof Response) return id;
    backendPayload.id = id;
    backendPayload.expense_id = id;
  }

  addOptionalField(backendPayload, 'category_id', payload, ['categoryId', 'category_id']);
  addOptionalField(backendPayload, 'account_id', payload, ['accountId', 'account_id']);
  addOptionalField(backendPayload, 'remark', payload, ['remark', 'notes']);
  addOptionalField(backendPayload, 'expense_date', payload, ['expenseDate', 'expense_date', 'date']);
  addOptionalField(backendPayload, 'date', payload, ['date', 'expenseDate', 'expense_date']);

  return backendPayload;
};

const buildDeletePayload = (payload: Record<string, unknown>) => {
  const id = readRequiredString(payload, ['expenseId', 'expense_id', 'id'], 'Expense');
  if (id instanceof Response) return id;

  return {
    id,
    expense_id: id,
  };
};

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid expense request payload.' }, { status: 400 });
  }

  const action = typeof payload.action === 'string' ? payload.action : 'list';
  const endpointByAction: Record<string, string> = {
    list: 'getExpenses',
    create: 'createExpense',
    update: 'updateExpense',
    delete: 'deleteExpense',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json({ success: false, message: 'Unsupported expense action.' }, { status: 400 });
  }

  const backendPayload = action === 'list'
    ? buildListPayload(payload)
    : action === 'create'
      ? buildMutationPayload(payload)
      : action === 'update'
        ? buildMutationPayload(payload, { includeId: true })
        : buildDeletePayload(payload);

  if (backendPayload instanceof Response) return backendPayload;

  try {
    // Token is httpOnly, so expense backend calls must happen from this route.
    return Response.json(await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    }));
  } catch (error) {
    return errorResponse(error, `Unable to ${action} expense.`);
  }
}
