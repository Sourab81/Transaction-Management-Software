import type {
  Transaction,
  TransactionBankPaymentDetails,
  TransactionCardPaymentDetails,
  TransactionPaymentDetails,
  TransactionPaymentMode,
  TransactionUpiPaymentDetails,
} from '../store';
import {
  extractCollectionItems,
  isRecord,
  readBooleanLikeValue,
  readNumberValue,
  readRecordValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

const normalizePaymentMode = (value: string | null): TransactionPaymentMode => {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'upi') return 'upi';
  if (normalizedValue === 'bank') return 'bank';
  if (normalizedValue === 'card') return 'card';

  return 'cash';
};

const normalizeTransactionStatus = (value: string | null): Transaction['status'] => {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'pending') return 'pending';
  if (normalizedValue === 'cancelled' || normalizedValue === 'canceled') return 'cancelled';
  if (normalizedValue === 'refunded' || normalizedValue === 'refund') return 'refunded';

  return 'completed';
};

const normalizeHandledByRole = (value: string | null): Transaction['handledByRole'] => {
  const normalizedValue = value?.trim().toLowerCase();

  return normalizedValue === 'employee' || normalizedValue === 'staff' || normalizedValue === 'operator'
    ? 'Employee'
    : 'Customer';
};

const readPaymentDetails = (
  record: UnknownRecord,
  paymentMode: TransactionPaymentMode,
): TransactionPaymentDetails | undefined => {
  const paymentRecord = readRecordValue(record, ['payment_details', 'paymentDetails', 'payment']);

  // TODO(api-transactions): expand this mapper when the backend confirms payment detail field names.
  const source = paymentRecord || record;

  if (paymentMode === 'upi') {
    const transactionId = readStringValue(source, ['transaction_id', 'transactionId', 'upi_transaction_id']);
    const utrNumber = readStringValue(source, ['utr_number', 'utrNumber', 'utr']);

    if (transactionId || utrNumber) {
      const details: TransactionUpiPaymentDetails = {
        kind: 'upi',
        transactionId: transactionId || '',
        utrNumber: utrNumber || '',
      };

      return details;
    }
  }

  if (paymentMode === 'card') {
    const transactionId = readStringValue(source, ['transaction_id', 'transactionId', 'card_transaction_id']);
    const cardType = readStringValue(source, ['card_type', 'cardType']) || '';
    const cardNetwork = readStringValue(source, ['card_network', 'cardNetwork']) || '';
    const lastFourDigits = readStringValue(source, ['last_four_digits', 'lastFourDigits', 'card_last_four']) || '';

    if (transactionId || cardType || cardNetwork || lastFourDigits) {
      const details: TransactionCardPaymentDetails = {
        kind: 'card',
        transactionId: transactionId || '',
        cardType,
        cardNetwork,
        lastFourDigits,
      };

      return details;
    }
  }

  if (paymentMode === 'bank') {
    const referenceNumber = readStringValue(source, ['bank_transaction_reference_number', 'bankReferenceNumber', 'reference_number']);
    const transferType = readStringValue(source, ['bank_transfer_type', 'bankTransferType', 'transfer_type']) || '';
    const accountHolder = readStringValue(source, ['sender_account_holder_name', 'senderAccountHolderName', 'account_holder_name']) || '';
    const bankName = readStringValue(source, ['sender_bank_name', 'senderBankName', 'bank_name']) || '';
    const accountNumber = readStringValue(source, ['sender_account_number', 'senderAccountNumber', 'account_number']) || '';

    if (referenceNumber || transferType || accountHolder || bankName || accountNumber) {
      const details: TransactionBankPaymentDetails = {
        kind: 'bank',
        bankTransferType: transferType,
        bankTransactionReferenceNumber: referenceNumber || '',
        senderAccountHolderName: accountHolder,
        senderBankName: bankName,
        senderAccountNumber: accountNumber,
      };

      return details;
    }
  }

  return undefined;
};

export const mapTransactionRecord = (record: UnknownRecord): Transaction | null => {
  const id = readStringValue(record, ['id', 'transaction_id', 'txn_id']);
  const customerName = readStringValue(record, ['customer_name', 'customerName', 'name']);

  if (!id || !customerName) {
    return null;
  }

  const paymentMode = normalizePaymentMode(readStringValue(record, ['payment_mode', 'paymentMode', 'mode']));
  const totalAmount = readNumberValue(record, ['total_amount', 'totalAmount', 'amount']) || 0;
  const paidAmount = readNumberValue(record, ['paid_amount', 'paidAmount', 'received_amount', 'receivedAmount']) || 0;
  const dueAmount = readNumberValue(record, ['due_amount', 'dueAmount', 'pending_amount']) ?? Math.max(totalAmount - paidAmount, 0);

  return {
    id,
    transactionNumber: readStringValue(record, ['transaction_number', 'transactionNumber', 'txn_number']) || `TXN-${id}`,
    customerId: readStringValue(record, ['customer_id', 'customerId']) || id,
    customerName,
    customerPhone: readStringValue(record, ['customer_phone', 'customerPhone', 'phone', 'mobile']) || 'Not added',
    serviceId: readStringValue(record, ['service_id', 'serviceId']) || id,
    service: readStringValue(record, ['service_name', 'service', 'service_title']) || 'Service',
    servicePrice: readNumberValue(record, ['service_price', 'servicePrice', 'price']) || totalAmount,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMode,
    paymentDetails: readPaymentDetails(record, paymentMode),
    departmentId: readStringValue(record, ['department_id', 'departmentId', 'counter_id', 'counterId']) || undefined,
    departmentName: readStringValue(record, ['department_name', 'departmentName', 'counter_name', 'counterName']) || 'General',
    accountId: readStringValue(record, ['account_id', 'accountId']) || undefined,
    accountLabel: readStringValue(record, ['account_label', 'accountLabel', 'account_name']) || 'Cash',
    handledById: readStringValue(record, ['handled_by_id', 'handledById', 'user_id']) || '',
    handledByName: readStringValue(record, ['handled_by_name', 'handledByName', 'operator_name', 'employee_name']) || 'Operator',
    handledByRole: normalizeHandledByRole(readStringValue(record, ['handled_by_role', 'handledByRole', 'user_role', 'role'])),
    note: readStringValue(record, ['note', 'remarks', 'remark']) || undefined,
    status: normalizeTransactionStatus(readStringValue(record, ['status', 'transaction_status'])),
    date: readStringValue(record, ['date', 'transaction_date', 'transactionDate']) || new Date().toISOString().split('T')[0],
    createdAt: readStringValue(record, ['created_at', 'createdAt', 'date']) || new Date().toISOString(),
    createdBy: readStringValue(record, ['created_by', 'createdBy']) || undefined,
    updatedAt: readStringValue(record, ['updated_at', 'updatedAt']) || undefined,
    updatedBy: readStringValue(record, ['updated_by', 'updatedBy']) || undefined,
    cancelledAt: readStringValue(record, ['cancelled_at', 'cancelledAt']) || undefined,
    cancelledBy: readStringValue(record, ['cancelled_by', 'cancelledBy']) || undefined,
    refundedAt: readStringValue(record, ['refunded_at', 'refundedAt']) || undefined,
    refundedBy: readStringValue(record, ['refunded_by', 'refundedBy']) || undefined,
    refundReason: readStringValue(record, ['refund_reason', 'refundReason']) || undefined,
    deletedAt: readStringValue(record, ['deleted_at', 'deletedAt']) || undefined,
    deletedBy: readStringValue(record, ['deleted_by', 'deletedBy']) || undefined,
    deleteReason: readStringValue(record, ['delete_reason', 'deleteReason']) || undefined,
    lastAuditAction: readStringValue(record, ['last_audit_action', 'lastAuditAction']) as Transaction['lastAuditAction'] | undefined,
    isDeleted: readBooleanLikeValue(record, ['is_deleted', 'isDeleted']) || false,
  };
};

export const mapTransactionsResponse = (payload: unknown) => {
  return extractCollectionItems(payload, ['data', 'transactions', 'items', 'rows', 'records']).reduce<Transaction[]>((transactions, entry) => {
    if (!isRecord(entry)) {
      return transactions;
    }

    const mappedTransaction = mapTransactionRecord(entry);
    if (mappedTransaction) {
      transactions.push(mappedTransaction);
    }

    return transactions;
  }, []);
};
