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
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

const errorResponse = (error: unknown, fallbackMessage = 'Unable to process transaction request.') => {
  if (error instanceof BackendFetchError) {
    return Response.json(
      { success: false, message: readBackendMessage(error.body, error.message || fallbackMessage) },
      { status: error.statusCode ?? 502 },
    );
  }

  return Response.json({ success: false, message: fallbackMessage }, { status: 502 });
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

    if (Number.isFinite(numericValue) && numericValue >= 0) {
      return numericValue;
    }
  }

  return Response.json({ success: false, message: `${label} must be a zero or positive number.` }, { status: 400 });
};

const readOptionalNumber = (
  payload: Record<string, unknown>,
  keys: string[],
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

  return 0;
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

const buildListPayload = (payload: Record<string, unknown>) => {
  const backendPayload: Record<string, unknown> = {
    page_no: 1,
    limit: 10,
    status: 1,
  };

  addOptionalField(backendPayload, 'page_no', payload, ['pageNo', 'page_no']);
  addOptionalField(backendPayload, 'limit', payload, ['limit']);
  addOptionalField(backendPayload, 'status', payload, ['status']);
  addOptionalField(backendPayload, 'search', payload, ['search']);
  addOptionalField(backendPayload, 'transaction_id', payload, ['transactionId', 'transaction_id']);
  addOptionalField(backendPayload, 'customer_id', payload, ['customerId', 'customer_id']);
  addOptionalField(backendPayload, 'counter_id', payload, ['counterId', 'counter_id']);
  addOptionalField(backendPayload, 'date', payload, ['date']);
  addOptionalField(backendPayload, 'date_from', payload, ['dateFrom', 'date_from']);
  addOptionalField(backendPayload, 'date_to', payload, ['dateTo', 'date_to']);

  return backendPayload;
};

const buildListPayloadFromUrl = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const payload: Record<string, unknown> = {};

  searchParams.forEach((value, key) => {
    payload[key] = value;
  });

  return buildListPayload(payload);
};

const buildChildRowsPayload = (payload: Record<string, unknown>) => {
  const rows = payload.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ success: false, message: 'At least one transaction row is required.' }, { status: 400 });
  }

  const mappedRows: Record<string, unknown>[] = [];

  for (const row of rows) {
    if (!isRecord(row)) {
      return Response.json({ success: false, message: 'Invalid transaction row payload.' }, { status: 400 });
    }

    const formName = readRequiredId(row, ['formName', 'form_name'], 'Form name');
    if (formName instanceof Response) return formName;

    const noOfTransaction = readRequiredNumber(row, ['noOfTransaction', 'no_of_transaction'], 'No. of transaction');
    if (noOfTransaction instanceof Response) return noOfTransaction;

    const inventoryId = readRequiredId(row, ['inventoryId', 'inventory_id', 'inventoryItemId'], 'Inventory');
    if (inventoryId instanceof Response) return inventoryId;

    const transactionAccount = readRequiredId(row, ['transactionAccount', 'transaction_account', 'transactionAccountId'], 'Transaction account');
    if (transactionAccount instanceof Response) return transactionAccount;

    const amount = readRequiredNumber(row, ['amount', 'transactionAmount', 'transaction_amount'], 'Amount');
    if (amount instanceof Response) return amount;

    const totalAmount = readRequiredNumber(row, ['totalAmount', 'total_amount'], 'Total amount');
    if (totalAmount instanceof Response) return totalAmount;

    const mappedRow: Record<string, unknown> = {
      form_name: formName,
      no_of_transaction: noOfTransaction,
      inventory_id: inventoryId,
      transaction_account: transactionAccount,
      amount,
      service_charge: readOptionalNumber(row, ['serviceCharge', 'service_charge']),
      bank_charge: readOptionalNumber(row, ['bankCharge', 'bank_charge']),
      other_charge: readOptionalNumber(row, ['otherCharge', 'other_charge']),
      total_amount: totalAmount,
    };

    addOptionalField(mappedRow, 'id', row, ['id', 'childId', 'transactionChildId']);
    addOptionalField(mappedRow, 'transaction_child_id', row, ['id', 'childId', 'transactionChildId']);
    addOptionalField(mappedRow, 'remark', row, ['remark']);
    mappedRows.push(mappedRow);
  }

  return mappedRows;
};

const buildCreatePayload = (payload: Record<string, unknown>) => {
  const customerId = readRequiredId(payload, ['customerId', 'customer_id'], 'Customer');
  if (customerId instanceof Response) return customerId;

  const counterId = readRequiredId(payload, ['counterId', 'counter_id'], 'Counter');
  if (counterId instanceof Response) return counterId;

  const rows = buildChildRowsPayload(payload);
  if (rows instanceof Response) return rows;

  const backendPayload: Record<string, unknown> = {
    customer_id: customerId,
    counter_id: counterId,
    rows,
  };

  addOptionalField(backendPayload, 'date', payload, ['date']);
  addOptionalField(backendPayload, 'staff_id', payload, ['staffId', 'staff_id']);

  return backendPayload;
};

const buildUpdatePayload = (payload: Record<string, unknown>) => {
  const transactionId = readRequiredId(payload, ['transactionId', 'transaction_id', 'id'], 'Transaction');
  if (transactionId instanceof Response) return transactionId;

  const backendPayload: Record<string, unknown> = {
    transaction_id: transactionId,
  };

  addOptionalField(backendPayload, 'customer_id', payload, ['customerId', 'customer_id']);
  addOptionalField(backendPayload, 'counter_id', payload, ['counterId', 'counter_id']);
  if (Array.isArray(payload.rows)) {
    const rows = buildChildRowsPayload(payload);
    if (rows instanceof Response) return rows;
    backendPayload.rows = rows;
  }
  if (Array.isArray(payload.removedRowIds)) {
    backendPayload.removed_row_ids = payload.removedRowIds;
  }
  addOptionalField(backendPayload, 'status', payload, ['status']);

  return backendPayload;
};

const buildDeletePayload = (payload: Record<string, unknown>) => {
  const transactionId = readRequiredId(payload, ['transactionId', 'transaction_id', 'id'], 'Transaction');
  if (transactionId instanceof Response) return transactionId;

  return { transaction_id: transactionId };
};

const buildPayPayload = (payload: Record<string, unknown>) => {
  const transactionId = readRequiredId(payload, ['transactionId', 'transaction_id', 'id'], 'Transaction');
  if (transactionId instanceof Response) return transactionId;

  const customerId = readRequiredId(payload, ['customerId', 'customer_id'], 'Customer');
  if (customerId instanceof Response) return customerId;

  const onlineAmount = readRequiredNumber(payload, ['onlineAmount', 'online_amount'], 'Online amount');
  if (onlineAmount instanceof Response) return onlineAmount;

  const cashAmount = readRequiredNumber(payload, ['cashAmount', 'cash_amount'], 'Cash amount');
  if (cashAmount instanceof Response) return cashAmount;

  const backendPayload: Record<string, unknown> = {
    transaction_id: transactionId,
    customer_id: customerId,
    online_amount: onlineAmount,
    cash_amount: cashAmount,
  };

  addOptionalField(backendPayload, 'counter_id', payload, ['counterId', 'counter_id']);
  addOptionalField(backendPayload, 'account_id', payload, ['accountId', 'account_id']);
  addOptionalField(backendPayload, 'remark', payload, ['remark']);

  return backendPayload;
};

export async function GET(request: Request) {
  try {
    // Transaction list can be loaded by older frontend callers with GET.
    return Response.json(await backendFetch('getTransactions', {
      method: 'POST',
      body: buildListPayloadFromUrl(request),
    }));
  } catch (error) {
    return errorResponse(error, 'Unable to list transaction.');
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  if (!isRecord(payload)) {
    return Response.json({ success: false, message: 'Invalid transaction request payload.' }, { status: 400 });
  }

  const action = typeof payload.action === 'string' ? payload.action : 'list';
  const endpointByAction: Record<string, string> = {
    list: 'getTransactions',
    create: 'createTransaction',
    update: 'updateTransaction',
    delete: 'deleteTransaction',
    pay: 'payTransaction',
  };
  const endpoint = endpointByAction[action];

  if (!endpoint) {
    return Response.json({ success: false, message: 'Unsupported transaction action.' }, { status: 400 });
  }

  const backendPayload = action === 'list'
    ? buildListPayload(payload)
    : action === 'create'
        ? buildCreatePayload(payload)
        : action === 'update'
          ? buildUpdatePayload(payload)
          : action === 'pay'
            ? buildPayPayload(payload)
            : buildDeletePayload(payload);

  if (backendPayload instanceof Response) return backendPayload;

  try {
    // Token is httpOnly, so this local route calls the backend server-side.
    return Response.json(await backendFetch(endpoint, {
      method: 'POST',
      body: backendPayload,
    }));
  } catch (error) {
    return errorResponse(error, `Unable to ${action} transaction.`);
  }
}
