import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  parsePrefetchedWorkspaceDataCookieValue,
  serializePrefetchedWorkspaceDataCookieValue,
} from '../lib/workspace-prefetch-cookie';

describe('workspace prefetch cookie', () => {
  test('round-trips prefetched counters for the next workspace load', () => {
    const value = serializePrefetchedWorkspaceDataCookieValue({
      counters: [
        {
          id: 'counter-1',
          name: 'Front Desk',
          code: 'CTR-1',
          openingBalance: 0,
          currentBalance: 1200,
          status: 'Active',
        },
      ],
    });

    const parsed = parsePrefetchedWorkspaceDataCookieValue(value);

    assert.deepEqual(parsed, {
      counters: [
        {
          id: 'counter-1',
          name: 'Front Desk',
          code: 'CTR-1',
          openingBalance: 0,
          currentBalance: 1200,
          status: 'Active',
        },
      ],
    });
  });
});
