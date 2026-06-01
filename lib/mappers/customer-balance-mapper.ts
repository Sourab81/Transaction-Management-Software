import type { CustomerBalance } from '../api/customerBalance';
import {
  extractCollectionItems,
  isRecord,
  readNumberValue,
  readUnknownValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export const mapCustomerBalanceRecord = (record: UnknownRecord): CustomerBalance | null => {
  const customerId = readStringValue(record, ['customer_id', 'customerId']) || '';
  const id = readStringValue(record, ['id', 'balance_id', 'balanceId']) || customerId;
  const currentBalanceStatus = readUnknownValue(record, ['current_balance_status', 'currentBalanceStatus', 'balance_status'])
    ?? readNumberValue(record, ['current_balance', 'currentBalance', 'balance'])
    ?? 0;

  if (!id || !customerId) return null;

  return {
    id,
    customerId,
    customerCode: readStringValue(record, ['customer_code', 'customerCode']) || undefined,
    customerName: readStringValue(record, ['customer_name', 'customerName', 'name']) || undefined,
    phoneNo: readStringValue(record, ['phone_no', 'phoneNo', 'mobile_no', 'mobileNo', 'customer_mobile_no']) || '',
    lastTransaction: readStringValue(record, ['last_transaction', 'lastTransaction', 'last_transaction_date']) || '',
    currentBalanceStatus: typeof currentBalanceStatus === 'number' || typeof currentBalanceStatus === 'string'
      ? currentBalanceStatus
      : String(currentBalanceStatus),
    status: readStringValue(record, ['status']) || readNumberValue(record, ['status']) || 1,
  };
};

export const mapCustomerBalanceResponse = (payload: unknown) => (
  extractCollectionItems(payload, ['data', 'balances', 'items', 'rows', 'records']).reduce<CustomerBalance[]>((balances, entry) => {
    if (!isRecord(entry)) return balances;

    const mappedBalance = mapCustomerBalanceRecord(entry);
    if (mappedBalance) balances.push(mappedBalance);

    return balances;
  }, [])
);
