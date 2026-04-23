import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { mapCountersResponse } from '../lib/mappers/counter-mapper';

describe('counter mapper', () => {
  test('normalizes legacy counter records into frontend counter models', () => {
    const counters = mapCountersResponse({
      data: [
        {
          counter_id: 42,
          department_name: 'Main Counter',
          balance: '2500',
          is_active: '1',
        },
      ],
    });

    assert.deepEqual(counters, [
      {
        id: '42',
        name: 'Main Counter',
        code: 'CTR-42',
        openingBalance: 0,
        currentBalance: 2500,
        status: 'Active',
      },
    ]);
  });
});

