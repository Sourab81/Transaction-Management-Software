import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildDailyClosingSummary,
  buildTransactionReceiptText,
  deriveTransactionStatus,
  getPostedTransactionAmount,
} from '../lib/transaction-workflow';

describe('transaction workflow helpers', () => {
  test('derives pending status when due remains and keeps completed when fully paid', () => {
    assert.deepEqual(deriveTransactionStatus('completed', 200, 150), {
      status: 'pending',
      dueAmount: 50,
    });

    assert.deepEqual(deriveTransactionStatus('pending', 200, 200), {
      status: 'completed',
      dueAmount: 0,
    });
  });

  test('keeps cancelled and refunded transactions out of posted balances', () => {
    assert.equal(getPostedTransactionAmount('completed', 200), 200);
    assert.equal(getPostedTransactionAmount('pending', 150), 150);
    assert.equal(getPostedTransactionAmount('cancelled', 150), 0);
    assert.equal(getPostedTransactionAmount('refunded', 150), 0);
  });

  test('builds a daily closing summary from transactions and expenses', () => {
    const summary = buildDailyClosingSummary(
      [
        {
          transactionNumber: 'TXN-1',
          customerName: 'John Doe',
          customerPhone: '1234567890',
          service: 'Mobile Recharge',
          totalAmount: 200,
          paidAmount: 200,
          dueAmount: 0,
          paymentMode: 'cash',
          status: 'completed',
          departmentName: 'Retail Counter',
          date: '2026-04-13',
        },
        {
          transactionNumber: 'TXN-2',
          customerName: 'Jane Smith',
          customerPhone: '0987654321',
          service: 'Mobile Recharge',
          totalAmount: 150,
          paidAmount: 100,
          dueAmount: 50,
          paymentMode: 'upi',
          status: 'pending',
          departmentName: 'Retail Counter',
          date: '2026-04-13',
        },
        {
          transactionNumber: 'TXN-3',
          customerName: 'Arun Kumar',
          customerPhone: '9999999999',
          service: 'Bill Payment',
          totalAmount: 80,
          paidAmount: 0,
          dueAmount: 0,
          paymentMode: 'bank',
          status: 'cancelled',
          departmentName: 'Back Office',
          date: '2026-04-13',
        },
        {
          transactionNumber: 'TXN-4',
          customerName: 'Ignore Me',
          service: 'Different Day',
          totalAmount: 999,
          paidAmount: 999,
          dueAmount: 0,
          paymentMode: 'cash',
          status: 'completed',
          date: '2026-04-12',
        },
      ],
      [
        { amount: 40, date: '2026-04-13', status: 'Active' },
        { amount: 10, date: '2026-04-13', status: 'Inactive' },
        { amount: 25, date: '2026-04-12', status: 'Active' },
      ],
      '2026-04-13',
    );

    assert.deepEqual(summary, {
      reportDate: '2026-04-13',
      transactionCount: 3,
      completedCount: 1,
      pendingCount: 1,
      cancelledCount: 1,
      refundedCount: 0,
      grossAmount: 430,
      collectedAmount: 300,
      outstandingAmount: 50,
      expenseAmount: 40,
      netAmount: 260,
      topService: 'Mobile Recharge',
      busiestDepartment: 'Retail Counter',
    });
  });

  test('builds a readable receipt export', () => {
    const receipt = buildTransactionReceiptText({
      transactionNumber: 'TXN-20260413-120000-ABCD',
      customerName: 'John Doe',
      customerPhone: '1234567890',
      service: 'Mobile Recharge',
      totalAmount: 200,
      paidAmount: 150,
      dueAmount: 50,
      paymentMode: 'upi',
      status: 'pending',
      departmentName: 'Retail Counter',
      accountLabel: 'Primary Account | Default Bank',
      handledByName: 'Owner User',
      handledByRole: 'Customer',
      note: 'Part payment received',
      date: '2026-04-13',
    });

    assert.match(receipt, /eNest Service Receipt/);
    assert.match(receipt, /Transaction No: TXN-20260413-120000-ABCD/);
    assert.match(receipt, /Payment Mode: UPI/);
    assert.match(receipt, /Due Amount: Rs\. 50/);
  });
});
