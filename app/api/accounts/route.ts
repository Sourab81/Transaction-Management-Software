import {
  proxyAuthenticatedGetRequest,
  proxyAuthenticatedPostRequest,
} from '../../../lib/api/server-proxy';
import { isRecord } from '../../../lib/mappers/legacy-record';

export const dynamic = 'force-dynamic';

const toBodyValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

export async function GET(request: Request) {
  return proxyAuthenticatedGetRequest('accounts', request);
}

export async function POST(request: Request) {
  const payload = await request.json();
  if (!isRecord(payload)) {
    return Response.json(
      { message: 'Invalid account request payload.' },
      { status: 400 },
    );
  }

  const action = typeof payload.action === 'string' ? payload.action : '';

  if (action === 'create') {
    return proxyAuthenticatedPostRequest('accountCreate', request, {
      acc_holder: toBodyValue(payload.acc_holder),
      bank_name: toBodyValue(payload.bank_name),
      acc_no: toBodyValue(payload.acc_no),
      ifsc_code: toBodyValue(payload.ifsc_code),
      branch: toBodyValue(payload.branch),
      opening_balance: toBodyValue(payload.opening_balance),
      current_balance: toBodyValue(payload.current_balance),
      remark: toBodyValue(payload.remark),
      status: toBodyValue(payload.status),
      counter_id: toBodyValue(payload.counter_id),
    });
  }

  if (action === 'delete') {
    return proxyAuthenticatedPostRequest('accountDelete', request, {
      id: toBodyValue(payload.id),
    });
  }

  if (action === 'linkDepartment') {
    return proxyAuthenticatedPostRequest('accountLinkDepartment', request, {
      account_id: toBodyValue(payload.account_id),
      counter_id: toBodyValue(payload.counter_id),
    });
  }

  return Response.json(
    { message: 'Unsupported account action.' },
    { status: 400 },
  );
}
