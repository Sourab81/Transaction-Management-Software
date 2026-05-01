import { normalizePhoneNumber } from '../validators/phone-validator';
import {
  extractCollectionItems,
  isRecord,
  normalizeEmailAddress,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export interface UserIdentityConflictInput {
  email?: string;
  phone?: string;
  excludedUserId?: string;
}

export interface UserIdentityConflictResult {
  email: boolean;
  phone: boolean;
}

const readUserId = (record: UnknownRecord) =>
  readStringValue(record, ['id', 'user_id', 'userId', 'business_id', 'employee_id']);

const readUserEmail = (record: UnknownRecord) =>
  readStringValue(record, ['email_id', 'email', 'user_email', 'login_email', 'username']);

const readUserPhone = (record: UnknownRecord) =>
  readStringValue(record, ['contact_no', 'phone', 'mobile', 'mobile_no', 'phone_number']);

export const findUserIdentityConflict = (
  payload: unknown,
  input: UserIdentityConflictInput,
): UserIdentityConflictResult => {
  const targetEmail = input.email ? normalizeEmailAddress(input.email) : '';
  const targetPhone = input.phone ? normalizePhoneNumber(input.phone) : '';
  const excludedUserId = input.excludedUserId?.trim();

  return extractCollectionItems(payload, ['data', 'users', 'businesses', 'items', 'rows', 'records'])
    .reduce<UserIdentityConflictResult>((conflict, entry) => {
      if (!isRecord(entry)) {
        return conflict;
      }

      const userId = readUserId(entry);
      if (excludedUserId && userId === excludedUserId) {
        return conflict;
      }

      const existingEmail = normalizeEmailAddress(readUserEmail(entry) || '');
      const existingPhone = normalizePhoneNumber(readUserPhone(entry) || '');

      return {
        email: conflict.email || Boolean(targetEmail && existingEmail === targetEmail),
        phone: conflict.phone || Boolean(targetPhone && existingPhone === targetPhone),
      };
    }, { email: false, phone: false });
};

export const hasUserIdentityConflict = (conflict: UserIdentityConflictResult) =>
  conflict.email || conflict.phone;
