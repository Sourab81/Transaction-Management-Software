import type { Transaction } from './store';

export const normalizeTransactionSearch = (value: string) => value.trim().toLowerCase();

export const matchesTransactionSearch = (
  transaction: Transaction,
  search: string,
) => {
  const normalizedSearch = normalizeTransactionSearch(search);

  if (!normalizedSearch) {
    return true;
  }

  return [
    transaction.customerName,
    transaction.customerCode,
    transaction.customerPhone,
    transaction.invoiceId,
    transaction.accountLabel,
    transaction.counterName,
    transaction.departmentName,
  ].some((value) => (
    typeof value !== 'undefined'
    && value !== null
    && String(value).toLowerCase().includes(normalizedSearch)
  ));
};
