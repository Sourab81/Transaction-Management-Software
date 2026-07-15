import { readBackendPagination, type BackendPagination } from '../api/pagination';
import {
  extractCollectionItems,
  isRecord,
  readNumberValue,
  readStringValue,
  type UnknownRecord,
} from './legacy-record';

export interface TransactionReportRow {
  transactionId: number;
  invoiceId: string;
  date: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  departmentName: string;
  formName: string;
  noOfTransaction: number;
  inventoryName: string;
  accountName: string;
  serviceCharge: number;
  bankCharge: number;
  otherCharge: number;
  totalAmount: number;
  remark: string;
  addedByName: string;
}

export interface TransactionReportResponse {
  status: boolean;
  message: string;
  data: TransactionReportRow[];
  pagination: BackendPagination;
}

const mapTransactionReportRow = (record: UnknownRecord): TransactionReportRow | null => {
  const transactionId = readNumberValue(record, ['transaction_id', 'transactionId']);
  if (!transactionId) return null;

  return {
    transactionId,
    invoiceId: readStringValue(record, ['invoice_id', 'invoiceId']) || '',
    date: readStringValue(record, ['date', 'transaction_date', 'transactionDate']) || '',
    customerId: readNumberValue(record, ['customer_id', 'customerId']) || 0,
    customerCode: readStringValue(record, ['customer_code', 'customerCode']) || '',
    customerName: readStringValue(record, ['customer_name', 'customerName']) || '',
    departmentName: readStringValue(record, ['department_name', 'departmentName', 'counter_name', 'counterName']) || '',
    formName: readStringValue(record, ['form_name', 'formName']) || '',
    noOfTransaction: readNumberValue(record, ['no_of_transaction', 'noOfTransaction']) || 1,
    inventoryName: readStringValue(record, ['inventory_name', 'inventoryName']) || '',
    accountName: readStringValue(record, ['account_name', 'accountName']) || '',
    serviceCharge: readNumberValue(record, ['service_charge', 'serviceCharge']) || 0,
    bankCharge: readNumberValue(record, ['bank_charge', 'bankCharge']) || 0,
    otherCharge: readNumberValue(record, ['other_charge', 'otherCharge']) || 0,
    totalAmount: readNumberValue(record, ['total_amount', 'totalAmount']) || 0,
    remark: readStringValue(record, ['remark', 'remarks']) || '',
    addedByName: readStringValue(record, ['added_by_name', 'addedByName']) || '',
  };
};

export const mapTransactionReportResponse = (payload: unknown): TransactionReportResponse => {
  const records = extractCollectionItems(payload, ['data', 'records']);
  const data = records.reduce<TransactionReportRow[]>((rows, entry) => {
    if (!isRecord(entry)) return rows;
    const row = mapTransactionReportRow(entry);
    if (row) rows.push(row);
    return rows;
  }, []);

  const pagination = readBackendPagination(payload, data.length, 1, 50);

  return {
    status: true,
    message: '',
    data,
    pagination,
  };
};
