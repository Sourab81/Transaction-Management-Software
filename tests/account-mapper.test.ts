import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { mapAccountsResponse } from '../lib/mappers/account-mapper';

describe('account mapper', () => {
  test('maps getAccounts records to the frontend account model', () => {
    const accounts = mapAccountsResponse({
      status: true,
      data: [
        {
          id: 1,
          acc_holder: 'SBI CURRENT',
          bank_name: 'SBI CURRENT',
          acc_no: '0',
          ifsc_code: '0',
          branch: 'Main',
          opening_balance: 41549,
          current_balance: 41549,
          remark: 'OB 01102024',
          status: 1,
          counter_id: 7,
          added_date: '2024-10-02 11:43:40',
        },
      ],
    });

    assert.equal(accounts.length, 1);
    assert.deepEqual(accounts[0], {
      id: '1',
      accountHolder: 'SBI CURRENT',
      bankName: 'SBI CURRENT',
      accountNumber: '0',
      ifsc: '0',
      branch: 'Main',
      openingBalance: 41549,
      currentBalance: 41549,
      status: 'Active',
      counterId: '7',
      remark: 'OB 01102024',
      date: '2024-10-02 11:43:40',
    });
  });

  test('maps empty backend account data to an empty list', () => {
    assert.deepEqual(mapAccountsResponse({ status: true, data: [] }), []);
  });

  test('defaults current balance to opening balance and maps inactive status', () => {
    const accounts = mapAccountsResponse({
      data: [
        {
          id: '2',
          acc_holder: 'Cash',
          bank_name: 'Bank',
          acc_no: '123',
          ifsc_code: 'IFSC0001',
          opening_balance: '100.50',
          status: 0,
        },
      ],
    });

    assert.equal(accounts[0].currentBalance, 100.5);
    assert.equal(accounts[0].status, 'Inactive');
    assert.equal(accounts[0].counterId, null);
  });
});
