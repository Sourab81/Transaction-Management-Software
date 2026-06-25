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

const buildUpdatePayload = (payload: Record<string, unknown>, expenseId: string) => {
  const category = readRequiredString(payload, ['category', 'categoryName', 'category_name'], 'Expense category');
  if (category instanceof Response) return category;
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

  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim()
    : typeof payload.expense_title === 'string' && payload.expense_title.trim()
      ? payload.expense_title.trim()
      : category;
  const backendPaymentMode = normalizedPaymentMode === 'department' ? 'cash' : normalizedPaymentMode;
  const backendPayload: Record<string, unknown> = {
    id: expenseId,
    expense_id: expenseId,
    title,
    expense_title: title,
    category,
    amount,
    payment_mode: backendPaymentMode,
    counter_id: counterId,
  };

  addOptionalField(backendPayload, 'category_id', payload, ['categoryId', 'category_id']);
  addOptionalField(backendPayload, 'account_id', payload, ['accountId', 'account_id']);
  addOptionalField(backendPayload, 'remark', payload, ['remark', 'notes']);
  addOptionalField(backendPayload, 'expense_date', payload, ['expenseDate', 'expense_date', 'date']);
  addOptionalField(backendPayload, 'date', payload, ['date', 'expenseDate', 'expense_date']);

  return backendPayload;
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const { expenseId } = await params;
  const payload = await readPayload(request);

  if (!expenseId) {
    return Response.json({ success: false, message: 'Expense is required.' }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid expense request payload.' }, { status: 400 });
  }

  const backendPayload = buildUpdatePayload(payload, expenseId);
  if (backendPayload instanceof Response) return backendPayload;

  try {
    // Token is httpOnly, so expense backend calls must happen from this route.
    return Response.json(await backendFetch('updateExpense', {
      method: 'POST',
      body: backendPayload,
    }));
  } catch (error) {
    return errorResponse(error, 'Unable to update expense.');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const { expenseId } = await params;

  if (!expenseId) {
    return Response.json({ success: false, message: 'Expense is required.' }, { status: 400 });
  }

  try {
    return Response.json(await backendFetch('deleteExpense', {
      method: 'POST',
      body: {
        id: expenseId,
        expense_id: expenseId,
      },
    }));
  } catch (error) {
    return errorResponse(error, 'Unable to delete expense.');
  }
}
