import type { Account } from '../store';
import {
  extractCollectionItems,
  isRecord,
  normalizeActiveStatus,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export const mapAccountRecord = (record: UnknownRecord): Account | null => {
  const id = readStringValue(record, ['id', 'account_id']);
  const accountHolder = readStringValue(record, ['accountHolder', 'account_holder', 'acc_holder', 'holder']);
  const bankName = readStringValue(record, ['bankName', 'bank_name']);
  const accountNumber = readStringValue(record, ['accountNumber', 'account_number', 'acc_no', 'accNo']);
  const ifsc = readStringValue(record, ['ifsc', 'ifsc_code', 'ifscCode']);

  if (!id || !accountHolder || !bankName || !accountNumber || !ifsc) {
    return null;
  }

  const openingBalance = readNumberValue(record, ['openingBalance', 'opening_balance']) ?? 0;
  const currentBalance = readNumberValue(record, ['currentBalance', 'current_balance', 'balance']) ?? 0;
  const rawStatus = readStringValue(record, ['status', 'is_active']);
  const branch = readStringValue(record, ['branch']) || undefined;
  const remark = readStringValue(record, ['remark', 'remarks', 'note']) || undefined;
  const addedByName = readStringValue(record, ['added_by_name', 'addedByName']) || undefined;
  const addedDate = readStringValue(record, ['added_date', 'addedDate', 'created_at', 'createdAt']) || '';

  return {
    id,
    accountHolder,
    accHolder: accountHolder,
    bankName,
    accountNumber,
    accNo: accountNumber,
    ifsc,
    ifscCode: ifsc,
    branch,
    openingBalance,
    currentBalance,
    status: normalizeActiveStatus(rawStatus),
    counterId: null,
    remark,
    addedByName,
    addedDate,
    date: addedDate,
  };
};

export const mapAccountsResponse = (payload: unknown) => {
  return extractCollectionItems(payload, ['data', 'accounts', 'items', 'rows', 'records']).reduce<Account[]>((accounts, entry) => {
    if (!isRecord(entry)) {
      return accounts;
    }

    const mappedAccount = mapAccountRecord(entry);
    if (mappedAccount) {
      accounts.push(mappedAccount);
    }

    return accounts;
  }, []);
};
