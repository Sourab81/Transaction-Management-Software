'use client';

import { directBackendGet } from './direct-backend';
import { isRecord, readNumberValue, readStringValue } from '../mappers/legacy-record';

export interface Customer {
  id: string;
  name: string;
  code: string;
  phone: string;
}

export interface CustomerPaymentTransaction {
  id: string;
  date: string;
  counterBank: string;
  debit: number;
  credit: number;
  balance: number;
  remark: string;
  addedBy: string;
}

interface CustomerSearchRecord {
  id?: string | number;
  customer_id?: string | number;
  customerId?: string | number;
  name?: string;
  customer_name?: string;
  customerName?: string;
  customer_code?: string | number;
  customerCode?: string | number;
  phone?: string | number;
  phone_no?: string | number;
  mobile_no?: string | number;
}

interface CustomerPaymentRecord {
  id?: string | number;
  payment_id?: string | number;
  transaction_id?: string | number;
  date?: string;
  payment_date?: string;
  added_date?: string;
  amount?: string | number;
  payment_amount?: string | number;
  total_paid?: string | number;
  type?: string;
  payment_type?: string;
  transaction_type?: string;
  note?: string;
  description?: string;
  remark?: string;
}

export interface CustomerSearchApiResponse {
  success?: boolean;
  status?: boolean | number;
  message?: string;
  data?: CustomerSearchRecord[];
  customers?: CustomerSearchRecord[];
}

export interface CustomerPaymentListApiResponse {
  success?: boolean;
  status?: boolean | number;
  message?: string;
  data?: CustomerPaymentRecord[];
  transactions?: CustomerPaymentRecord[];
  total?: number;
  total_pages?: number;
  current_page?: number;
  page?: number;
  pagination?: {
    total_records?: number;
    total_pages?: number;
    current_page?: number;
    page_no?: number;
    limit?: number;
  };
}

export interface CustomerPaymentPage {
  transactions: CustomerPaymentTransaction[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

const mapCustomer = (record: CustomerSearchRecord): Customer | null => {
  if (!isRecord(record)) return null;

  const id = readStringValue(record, ['customer_id', 'customerId', 'id']);
  const name = readStringValue(record, ['customer_name', 'customerName', 'name']);
  if (!id || !name) return null;

  return {
    id,
    name,
    code: readStringValue(record, ['customer_code', 'customerCode']) || '',
    phone: readStringValue(record, ['phone', 'phone_no', 'mobile_no', 'mobileNo']) || '',
  };
};

const mapTransaction = (
  record: CustomerPaymentRecord,
  index: number,
): CustomerPaymentTransaction | null => {
  if (!isRecord(record)) return null;
  const date = readStringValue(record, ['date', 'ledger_date', 'added_date']);
  const id = readStringValue(record, ['id', 'row_id']) || `row-${index}`;
  return {
    id,
    date: date || '',
    counterBank: readStringValue(record, ['counter_bank', 'counterBank']) || 'CASH COUNTER',
    debit: readNumberValue(record, ['debit']) || 0,
    credit: readNumberValue(record, ['credit']) || 0,
    balance: readNumberValue(record, ['balance']) || 0,
    remark: readStringValue(record, ['remark']) || '-',
    addedBy: readStringValue(record, ['added_by', 'addedBy', 'added_by_name']) || '-',
  };
};

export const searchCustomers = async (query: string, signal?: AbortSignal) => {
  if (query.length < 2) {
    return [];
  }

  const response = await directBackendGet<CustomerSearchApiResponse>(
    `userapi/customerSearch?q=${encodeURIComponent(query)}`,
    signal,
  );
  const records = response.data ?? response.customers ?? [];

  return records.reduce<Customer[]>((customers, record) => {
    const customer = mapCustomer(record);
    if (customer) customers.push(customer);
    return customers;
  }, []);
};

export const getCustomerPaymentPage = async (
  customerId: string,
  page: number,
  limit = 10,
  dateFrom = '',
  dateTo = '',
  signal?: AbortSignal,
): Promise<CustomerPaymentPage> => {
  const params = new URLSearchParams({
    customer_id: customerId,
    page: String(page),
    limit: String(limit),
  });
  if (dateFrom) params.set('from_date', dateFrom);
  if (dateTo) params.set('to_date', dateTo);

  const response = await directBackendGet<CustomerPaymentListApiResponse>(
    `userapi/customerPaymentList?${params.toString()}`,
    signal,
  );
  const records = response.data ?? response.transactions ?? [];
  const transactions = records.reduce<CustomerPaymentTransaction[]>((items, record, index) => {
    const transaction = mapTransaction(record, index);
    if (transaction) items.push(transaction);
    return items;
  }, []);
  const responseLimit = response.pagination?.limit ?? limit;
  const totalRecords = response.pagination?.total_records ?? response.total ?? transactions.length;
  const totalPages = response.pagination?.total_pages
    ?? response.total_pages
    ?? Math.max(1, Math.ceil(totalRecords / responseLimit));

  return {
    transactions,
    currentPage: response.pagination?.current_page
      ?? response.pagination?.page_no
      ?? response.current_page
      ?? response.page
      ?? page,
    totalPages: Math.max(1, totalPages),
    totalRecords,
    limit: responseLimit,
  };
};
