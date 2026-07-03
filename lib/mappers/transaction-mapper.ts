import type {
  Transaction,
  TransactionBankPaymentDetails,
  TransactionCardPaymentDetails,
  TransactionPaymentDetails,
  TransactionPaymentMode,
  TransactionUpiPaymentDetails,
} from '../store';
import {
  readBackendPagination,
  type BackendPagination,
} from '../api/pagination';
import {
  extractCollectionItems,
  extractFirstRecordWithKeys,
  isRecord,
  readBooleanLikeValue,
  readNumberValue,
  readRecordValue,
  readArrayValue,
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

  if (normalizedValue === '1' || normalizedValue === 'active' || normalizedValue === 'success') return 'completed';
  if (normalizedValue === '0' || normalizedValue === 'inactive' || normalizedValue === 'deleted') return 'cancelled';
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

const mapTransactionChildRow = (record: UnknownRecord) => ({
  id: readStringValue(record, ['id', 'transaction_child_id', 'child_id']) || undefined,
  transactionId: readStringValue(record, ['transaction_id', 'transactionId']) || undefined,
  formName: readStringValue(record, ['form_name', 'formName']) || '',
  noOfTransaction: readNumberValue(record, ['no_of_transaction', 'noOfTransaction']) || 1,
  inventoryId: readStringValue(record, ['inventory_id', 'inventoryId', 'inventoryItemId']) || '',
  inventoryName: readStringValue(record, ['inventory_name', 'inventoryName', 'service_name', 'product_name']) || undefined,
  transactionAccount: readStringValue(record, ['account_id', 'transaction_account', 'transactionAccount', 'transaction_account_id', 'transactionAccountId']) || 'other',
  amount: readNumberValue(record, ['amount', 'transaction_amount', 'transactionAmount']) || 0,
  serviceCharge: readNumberValue(record, ['service_charge', 'serviceCharge']) || 0,
  bankCharge: readNumberValue(record, ['bank_charge', 'bankCharge']) || 0,
  otherCharge: readNumberValue(record, ['other_charge', 'otherCharge']) || 0,
  totalAmount: readNumberValue(record, ['total_amount', 'totalAmount']) || 0,
  remark: readStringValue(record, ['remark', 'remarks', 'note']) || undefined,
});

export const mapTransactionRecord = (record: UnknownRecord): Transaction | null => {
  const id = readStringValue(record, ['transaction_id', 'transactionId', 'id', 'txn_id']);

  if (!id) {
    return null;
  }

  const customerRecord = readRecordValue(record, ['customer', 'customer_details', 'customerDetails']);
  const customerId = readStringValue(record, ['customerId', 'customer_id'])
    || readStringValue(customerRecord, ['id', 'customerId', 'customer_id'])
    || '';
  const customerCode = readStringValue(record, ['customer_code', 'customerCode'])
    || readStringValue(customerRecord, ['customer_code', 'customerCode', 'code'])
    || undefined;
  const customerName = readStringValue(record, ['customer_name', 'customerName', 'name'])
    || readStringValue(customerRecord, ['customer_name', 'customerName', 'name'])
    || undefined;
  const customerPhone = readStringValue(record, ['mobile_no', 'mobileNo', 'customer_mobile_no', 'customerPhone', 'phone'])
    || readStringValue(customerRecord, ['mobile_no', 'mobileNo', 'phone'])
    || '';
  const customerEmail = readStringValue(record, ['email', 'customer_email', 'customerEmail'])
    || readStringValue(customerRecord, ['email', 'customer_email'])
    || undefined;
  const customerAddress = readStringValue(record, ['address', 'customer_address', 'customerAddress'])
    || readStringValue(customerRecord, ['address', 'customer_address'])
    || undefined;
  const customerDob = readStringValue(record, ['dob', 'date_of_birth', 'customer_dob', 'customerDob'])
    || readStringValue(customerRecord, ['dob', 'date_of_birth'])
    || undefined;
  const customerColor = readStringValue(record, ['customer_color', 'customerColor', 'color_code', 'colorCode', 'color'])
    || readStringValue(customerRecord, ['customer_color', 'customerColor', 'color_code', 'colorCode', 'color'])
    || null;
  const customerColorId = readStringValue(record, ['customer_color_id', 'customerColorId', 'colorId', 'color_id'])
    || readStringValue(customerRecord, ['customer_color_id', 'customerColorId', 'colorId', 'color_id'])
    || null;
  const customerDisplay = customerName || customerCode || (customerId ? `Customer #${customerId}` : 'Customer');
  const paymentMode = normalizePaymentMode(readStringValue(record, ['payment_mode', 'paymentMode', 'mode']));
  const amount = readNumberValue(record, ['transactionAmount', 'transaction_amount', 'amount', 'base_amount', 'baseAmount']) || 0;
  const serviceCharge = readNumberValue(record, ['service_charge', 'serviceCharge']) || 0;
  const bankCharge = readNumberValue(record, ['bank_charge', 'bankCharge']) || 0;
  const otherCharge = readNumberValue(record, ['other_charge', 'otherCharge']) || 0;
  const totalAmount = readNumberValue(record, ['total_amount', 'totalAmount'])
    ?? amount + serviceCharge + bankCharge + otherCharge;
  const paidAmount = readNumberValue(record, ['paid_amount', 'paidAmount', 'received_amount', 'receivedAmount']) || 0;
  const dueAmount = readNumberValue(record, ['due_amount', 'dueAmount', 'pending_amount']) ?? Math.max(totalAmount - paidAmount, 0);
  const currentBalance = readNumberValue(record, ['current_balance', 'currentBalance']);
  const invoiceId = readStringValue(record, ['invoiceId', 'invoice_id']) || `TXN-${id}`;
  const transactionNo = readStringValue(record, ['transaction_no', 'transactionNo', 'transaction_number', 'transactionNumber', 'txn_number']) || invoiceId;
  const serviceProduct = readStringValue(record, ['service_product', 'serviceProduct', 'service_name', 'service', 'service_title']) || 'Service';
  const transactionAccountId = readStringValue(record, ['transaction_account_id', 'transactionAccountId', 'account_id', 'accountId']) || undefined;
  const remark = readStringValue(record, ['remark', 'remarks', 'note']) || undefined;
  const departmentId = readStringValue(record, ['department_id', 'departmentId', 'counter_id', 'counterId']) || undefined;
  const departmentName = readStringValue(record, ['department_name', 'departmentName', 'counter_name', 'counterName']) || 'General';
  const addedDate = readStringValue(record, ['added_date', 'addedDate', 'created_at', 'createdAt']) || undefined;
  const addedByName = readStringValue(record, ['added_by_name', 'addedByName']) || undefined;
  const rows = (readArrayValue(record, ['rows', 'children', 'child_rows', 'transaction_child', 'transactionChildren']) || [])
    .filter(isRecord)
    .map(mapTransactionChildRow);
  const numberOfTransactions = readNumberValue(record, [
    'number_of_transactions',
    'numberOfTransactions',
    'child_row_count',
    'noOfTransaction',
    'no_of_transaction',
    'no_of_items',
  ]) || rows.length || 1;

  return {
    id,
    invoiceId,
    formName: readStringValue(record, ['form_name', 'formName']) || '',
    transactionNo,
    transactionNumber: transactionNo,
    customerId: customerId || id,
    customerCode,
    customerName: customerDisplay,
    customerColorId,
    customerColor,
    customerPhone,
    customerEmail,
    customerAddress,
    customerDob,
    serviceId: readStringValue(record, ['service_id', 'serviceId']) || id,
    serviceProduct,
    service: serviceProduct,
    servicePrice: readNumberValue(record, ['service_price', 'servicePrice', 'price']) || amount,
    transactionAccountId,
    amount,
    transactionAmount: amount,
    serviceCharge,
    bankCharge,
    otherCharge,
    currentBalance: currentBalance ?? undefined,
    noOfTransaction: numberOfTransactions,
    numberOfTransactions,
    rows,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMode,
    paymentDetails: readPaymentDetails(record, paymentMode),
    departmentId,
    departmentName,
    counterName: departmentName,
    accountId: transactionAccountId,
    accountLabel: readStringValue(record, ['account_label', 'accountLabel', 'account_name']) || 'Cash',
    handledById: readStringValue(record, ['handled_by_id', 'handledById', 'user_id']) || '',
    handledByName: readStringValue(record, ['handled_by_name', 'handledByName', 'operator_name', 'employee_name']) || 'Operator',
    handledByRole: normalizeHandledByRole(readStringValue(record, ['handled_by_role', 'handledByRole', 'user_role', 'role'])),
    remark,
    note: remark,
    status: normalizeTransactionStatus(readStringValue(record, ['status', 'transaction_status'])),
    date: readStringValue(record, ['date', 'transaction_date', 'transactionDate', 'added_date', 'addedDate']) || new Date().toISOString().split('T')[0],
    createdAt: readStringValue(record, ['created_at', 'createdAt', 'added_date', 'addedDate', 'date']) || new Date().toISOString(),
    createdBy: readStringValue(record, ['created_by', 'createdBy']) || undefined,
    addedDate,
    addedByName,
    updatedAt: readStringValue(record, ['updated_at', 'updatedAt']) || undefined,
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

export interface TransactionsPage {
  transactions: Transaction[];
  pagination: BackendPagination;
}

export const mapTransactionsPageResponse = (
  payload: unknown,
  requestedPage = 1,
  requestedLimit = 10,
): TransactionsPage => {
  const transactions = mapTransactionsResponse(payload);

  return {
    transactions,
    pagination: readBackendPagination(payload, transactions.length, requestedPage, requestedLimit),
  };
};

export const mapTransactionDetailResponse = (payload: unknown): Transaction | null => {
  const record = extractFirstRecordWithKeys(
    payload,
    ['transaction_id', 'transactionId', 'txn_id'],
    ['data', 'transaction', 'item', 'result', 'details'],
  );

  return record ? mapTransactionRecord(record) : mapTransactionsResponse(payload)[0] || null;
};
