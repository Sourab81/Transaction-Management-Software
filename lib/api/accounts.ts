'use client';

import type { Account } from '../store';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';
import { DirectBackendError, directBackendPost, directBackendGet } from './direct-backend';

export interface AccountMutationInput {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  openingBalance: number;
  status?: Account['status'];
  branch?: string;
  remark?: string;
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
  if (isRecord(payload) && (payload.status === false || payload.success === false)) {
    throw new DirectBackendError(
      readAccountsApiErrorMessage(payload, fallbackMessage),
      400,
      payload,
    );
  }

  return payload;
};

const buildCreateAccountPayload = (input: AccountMutationInput) => ({
  acc_holder: input.accountHolder,
  bank_name: input.bankName,
  acc_no: input.accountNumber,
  ifsc_code: input.ifsc,
  branch: input.branch,
  opening_balance: input.openingBalance,
  remark: input.remark,
  status: input.status === 'Inactive' ? 0 : 1,
});

export const getAccountsResponse = async () => {
  try {
    const payload = await directBackendGet('getAccounts');
    return isNoDataFoundBody(payload) ? [] : payload;
  } catch (error) {
    if (error instanceof DirectBackendError && isNoDataFoundBody(error.body)) {
      return [];
    }

    throw error;
  }
};

export const createAccount = async (input: AccountMutationInput) => {
  const payload = await directBackendPost('createAccount', buildCreateAccountPayload(input));
  return ensureSuccessPayload(payload, 'Unable to create account.');
};

export const deleteAccount = async (id: string) => {
  const payload = await directBackendPost('deleteAccount', { id });
  return ensureSuccessPayload(payload, 'Unable to delete account.');
};
