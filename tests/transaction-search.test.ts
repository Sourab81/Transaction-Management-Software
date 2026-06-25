import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildTransactionsListPath } from '../lib/api/transactions';
import type { Transaction } from '../lib/store';
import { matchesTransactionSearch } from '../lib/transaction-search';

const transaction = {
  id: '1',
  customerName: 'Cux Retail',
  customerCode: 'CUS-0042',
  customerPhone: '9876543210',
  invoiceId: 'INV-2026-009',
  accountLabel: 'Primary Account',
  counterName: 'Front Counter',
  departmentName: 'Front Counter',
} as Transaction;

describe('transaction list search', () => {
  test('trims and sends search with the requested filtered page', () => {
    assert.equal(
      buildTransactionsListPath({ search: ' cux ', pageNo: 2, limit: 10 }),
      '/api/transactions?search=cux&pageNo=2&limit=10&status=1',
    );
  });

  test('matches every supported transaction search field', () => {
    ['cux', 'cus-0042', '9876543210', 'inv-2026', 'primary account', 'front counter']
      .forEach((search) => assert.equal(matchesTransactionSearch(transaction, search), true));
  });

  test('rejects unrelated transaction rows', () => {
    assert.equal(matchesTransactionSearch(transaction, 'unrelated'), false);
  });
});
