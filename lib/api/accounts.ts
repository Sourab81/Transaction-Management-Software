import type { Account } from '../store';
import {
  isRecord,
  readJoinedMessage,
} from '../mappers/legacy-record';
import { mapAccountsResponse } from '../mappers/account-mapper';
import {
  AppApiError,
  requestAppApi,
  requestAppApiMutation,
} from './app-client';
import {
  BackendApiConfigurationError,
  requestBackendCollection,
} from './backend-client';

export interface AccountMutationInput {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  openingBalance: number;
  currentBalance?: number;
  status?: Account['status'];
  counterId?: string | null;
  branch?: string;
  remark?: string;
}

export class AccountsApiError extends Error {
  readonly statusCode: number | null;
  readonly body: unknown;

  constructor(message: string, statusCode: number | null, body: unknown) {
    super(message);
    this.name = 'AccountsApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

const readAccountsApiErrorMessage = (
  body: unknown,
  fallbackMessage: string,
) => {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (isRecord(body)) {
    return readJoinedMessage(body.message) || readJoinedMessage(body.error) || fallbackMessage;
  }

  return fallbackMessage;
};

const isNoDataFoundBody = (body: unknown) =>
  readAccountsApiErrorMessage(body, '').trim().toLowerCase() === 'no data found';

const ensureSuccessPayload = (payload: unknown, fallbackMessage: string) => {
  if (isRecord(payload) && payload.status === false) {
    throw new AppApiError(
      readAccountsApiErrorMessage(payload, fallbackMessage),
      400,
      payload,
    );
  }

  return payload;
};

export const getAccountsResponse = async () => {
  try {
    const payload = await requestAppApi(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAccounts`);

    return isNoDataFoundBody(payload) ? [] : payload;
  } catch (error) {
    if (error instanceof AppApiError && isNoDataFoundBody(error.body)) {
      return [];
    }

    throw error;
  }
};

export const getAccountsWithToken = async (
  token: string,
): Promise<Account[]> => {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new AccountsApiError(
      'Login succeeded, but no auth token was available for the accounts request.',
      401,
      null,
    );
  }

  let response: Awaited<ReturnType<typeof requestBackendCollection>>;

  try {
    response = await requestBackendCollection('accounts', normalizedToken);
  } catch (error) {
    if (error instanceof BackendApiConfigurationError) {
      throw new AccountsApiError(error.message, error.statusCode, null);
    }

    throw new AccountsApiError(
      'Unable to reach the accounts service right now.',
      502,
      null,
    );
  }

  if (response.statusCode >= 400) {
    if (isNoDataFoundBody(response.body)) {
      return [];
    }

    throw new AccountsApiError(
      readAccountsApiErrorMessage(
        response.body,
        response.statusCode === 401 || response.statusCode === 403
          ? 'Your session is not authorized to load accounts.'
          : 'Unable to load accounts right now.',
      ),
      response.statusCode,
      response.body,
    );
  }

  if (isNoDataFoundBody(response.body)) {
    return [];
  }

  return mapAccountsResponse(response.body);
};

const buildCreateAccountPayload = (input: AccountMutationInput) => ({
  action: 'create',
  acc_holder: input.accountHolder,
  bank_name: input.bankName,
  acc_no: input.accountNumber,
  ifsc_code: input.ifsc,
  branch: input.branch,
  opening_balance: input.openingBalance,
  current_balance: input.currentBalance,
  remark: input.remark,
  status: input.status === 'Inactive' ? 0 : 1,
  counter_id: input.counterId || undefined,
});

export const createAccount = async (input: AccountMutationInput) => {
  const payload = await requestAppApiMutation('/api/accounts', buildCreateAccountPayload(input));
  return ensureSuccessPayload(payload, 'Unable to create account.');
};

export const deleteAccount = async (id: string) => {
  const payload = await requestAppApiMutation('/api/accounts', {
    action: 'delete',
    id,
  });

  return ensureSuccessPayload(payload, 'Unable to delete account.');
};

export const linkAccountToDepartment = async (
  accountId: string,
  counterId: string,
) => {
  const payload = await requestAppApiMutation('/api/accounts', {
    action: 'linkDepartment',
    account_id: accountId,
    counter_id: counterId,
  });

  return ensureSuccessPayload(payload, 'Unable to link account to department.');
};
