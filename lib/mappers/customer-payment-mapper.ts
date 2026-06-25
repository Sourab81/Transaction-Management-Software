import type { CustomerPayment } from '../api/customerPayments';
import {
  extractCollectionItems,
  isRecord,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export const mapCustomerPaymentRecord = (record: UnknownRecord): CustomerPayment | null => {
  const id = readStringValue(record, ['id', 'payment_id', 'paymentId', 'transaction_payment_id'])
    || readStringValue(record, ['invoice_id', 'invoiceId'])
    || '';
  const customerId = readStringValue(record, ['customer_id', 'customerId']) || '';

  if (!id || !customerId) return null;

  const onlineAmount = readNumberValue(record, ['online_amount', 'onlineAmount', 'account_amount']) || 0;
  const cashAmount = readNumberValue(record, ['cash_amount', 'cashAmount']) || 0;
  const debitAmount = readNumberValue(record, ['debit', 'debit_amount', 'debitAmount', 'transaction_amount', 'transactionAmount']);
  const creditAmount = readNumberValue(record, ['credit', 'credit_amount', 'creditAmount', 'received_amount', 'receivedAmount']);
  const totalPaid = readNumberValue(record, ['total_paid', 'totalPaid', 'payment_amount', 'paid_amount'])
    ?? onlineAmount + cashAmount;

  return {
    id,
    paymentDate: readStringValue(record, ['payment_date', 'paymentDate', 'added_date', 'addedDate', 'date']) || '',
    invoiceId: readStringValue(record, ['invoice_id', 'invoiceId']) || '-',
    customerId,
    customerCode: readStringValue(record, ['customer_code', 'customerCode']) || undefined,
    customerName: readStringValue(record, ['customer_name', 'customerName', 'name']) || undefined,
    counterId: readStringValue(record, ['counter_id', 'counterId']) || undefined,
    counterName: readStringValue(record, ['counter_name', 'counterName', 'department_name', 'departmentName']) || undefined,
    onlineAmount,
    cashAmount,
    debitAmount: debitAmount ?? undefined,
    creditAmount: creditAmount ?? undefined,
    totalPaid,
    currentBalance: readNumberValue(record, ['current_balance', 'currentBalance', 'balance', 'running_balance', 'runningBalance']) ?? undefined,
    accountName: readStringValue(record, ['account_name', 'accountName', 'bank_name', 'bankName']) || undefined,
    remark: readStringValue(record, ['remark', 'remarks', 'source_remark', 'sourceRemark', 'description']) || undefined,
    addedByName: readStringValue(record, ['added_by_name', 'addedByName']) || undefined,
    status: readStringValue(record, ['status']) || readNumberValue(record, ['status']) || 1,
  };
};

export const mapCustomerPaymentsResponse = (payload: unknown) => (
  extractCollectionItems(payload, ['data', 'payments', 'items', 'rows', 'records']).reduce<CustomerPayment[]>((payments, entry) => {
    if (!isRecord(entry)) return payments;

    const mappedPayment = mapCustomerPaymentRecord(entry);
    if (mappedPayment) payments.push(mappedPayment);

    return payments;
  }, [])
);
