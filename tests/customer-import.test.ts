import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formatImportedCustomers, parseCustomerImportText } from '../lib/customer-import';

describe('customer import parsing', () => {
  test('parses header-based customer rows', () => {
    const rows = parseCustomerImportText([
      'Name, Phone, Email',
      'Riya Sharma, 98765 43210, riya@example.com',
      'Amit Verma, 9988776655, amit@example.com',
    ].join('\n'));

    assert.deepEqual(rows, [
      {
        name: 'Riya Sharma',
        phone: '9876543210',
        email: 'riya@example.com',
      },
      {
        name: 'Amit Verma',
        phone: '9988776655',
        email: 'amit@example.com',
      },
    ]);
  });

  test('parses key value customer blocks', () => {
    const rows = parseCustomerImportText([
      'Name: Riya Sharma',
      'Phone: 9876543210',
      'Email: riya@example.com',
      '',
      'Name: Amit Verma',
      'Mobile: 9988776655',
    ].join('\n'));

    assert.deepEqual(rows, [
      {
        name: 'Riya Sharma',
        phone: '9876543210',
        email: 'riya@example.com',
      },
      {
        name: 'Amit Verma',
        phone: '9988776655',
      },
    ]);
  });

  test('formats imported customers back into review text', () => {
    const formattedRows = formatImportedCustomers([
      {
        name: 'Riya Sharma',
        phone: '9876543210',
        email: 'riya@example.com',
      },
      {
        name: 'Amit Verma',
        phone: '9988776655',
      },
    ]);

    assert.equal(
      formattedRows,
      'Riya Sharma, 9876543210, riya@example.com\nAmit Verma, 9988776655',
    );
  });
});
