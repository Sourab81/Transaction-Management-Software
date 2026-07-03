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
  const currentBalanceStatus = readNumberValue(record, ['current_balance', 'currentBalance', 'balance'])
    ?? readUnknownValue(record, ['current_balance_status', 'currentBalanceStatus', 'balance_status'])
    ?? 0;
  const balance = readNumberValue(record, ['balance', 'running_balance', 'runningBalance', 'current_balance', 'currentBalance']);

  if (!id || !customerId) return null;

  return {
    id,
    customerId,
    customerCode: readStringValue(record, ['customer_code', 'customerCode']) || undefined,
    customerName: readStringValue(record, ['customer_name', 'customerName', 'name']) || undefined,
    phoneNo: readStringValue(record, ['phone', 'phone_no', 'phoneNo', 'mobile_no', 'mobileNo', 'customer_mobile_no']) || '',
    lastTransaction: readStringValue(record, ['last_service_date', 'lastServiceDate', 'latest_service_date', 'latestServiceDate', 'last_transaction', 'lastTransaction', 'last_transaction_date']) || '',
    date: readStringValue(record, ['date', 'ledger_date', 'ledgerDate', 'payment_date', 'paymentDate', 'added_date', 'addedDate', 'last_transaction', 'lastTransaction']) || undefined,
    colorId: readStringValue(record, ['colorId', 'color_id', 'customer_color_id', 'customerColorId']) || null,
    color: readStringValue(record, ['color', 'color_code', 'colorCode', 'customer_color', 'customerColor', 'customer_colour']) || null,
    counterOrBank: readStringValue(record, [
      'counter_bank',
      'counterBank',
      'counter_or_bank',
      'counterOrBank',
      'account_name',
      'accountName',
      'bank_name',
      'bankName',
      'counter_name',
      'counterName',
      'department_name',
      'departmentName',
    ]) || undefined,
    debit: readNumberValue(record, ['debit', 'debit_amount', 'debitAmount', 'transaction_amount', 'transactionAmount']) ?? undefined,
    credit: readNumberValue(record, ['credit', 'credit_amount', 'creditAmount', 'received_amount', 'receivedAmount', 'payment_amount', 'paymentAmount', 'total_paid', 'totalPaid']) ?? undefined,
    balance: balance ?? undefined,
    todayBalance: readNumberValue(record, ['today_balance', 'todayBalance']) ?? 0,
    todayBalanceStatus: readStringValue(record, ['today_balance_status', 'todayBalanceStatus']) || 'clear',
    remark: readStringValue(record, ['remark', 'remarks', 'source_remark', 'sourceRemark', 'description']) || undefined,
    addedByName: readStringValue(record, ['added_by_name', 'addedByName', 'staff_name', 'staffName', 'user_name', 'userName']) || undefined,
    currentBalanceStatus: typeof currentBalanceStatus === 'number' || typeof currentBalanceStatus === 'string'
      ? currentBalanceStatus
      : String(currentBalanceStatus),
    status: readStringValue(record, ['status']) || readNumberValue(record, ['status']) || 1,
  };
};

export const mapCustomerBalanceResponse = (payload: unknown) => {
  const records = extractCollectionItems(payload, ['data', 'balances', 'items', 'rows', 'records']);
  const mappedRows = records.reduce<CustomerBalance[]>((balances, entry) => {
    if (!isRecord(entry)) return balances;

    const mappedBalance = mapCustomerBalanceRecord(entry);
    if (mappedBalance) balances.push(mappedBalance);

    return balances;
  }, []);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Customers Outstanding][Mapper] Source records:', records);
    console.log('[Customers Outstanding][Mapper] Mapped rows:', mappedRows);
  }

  return mappedRows;
};
