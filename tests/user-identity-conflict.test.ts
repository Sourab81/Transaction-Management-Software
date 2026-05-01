import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  findUserIdentityConflict,
  hasUserIdentityConflict,
} from '../lib/mappers/user-identity-conflict';

describe('user identity conflict mapper', () => {
  const userListPayload = {
    data: [
      {
        id: 1,
        email_id: 'admin@example.test',
        contact_no: '919999999999',
        user_type: 'Admin',
      },
      {
        id: 2,
        username: 'cash@example.test',
        contact_no: '8888888888',
        user_type: 'Business',
      },
      {
        id: 3,
        user_email: 'employee@example.test',
        mobile_no: '+91 77777 77777',
        user_type: 'Employee',
      },
    ],
  };

  test('detects duplicate email and phone across all user records', () => {
    assert.deepEqual(findUserIdentityConflict(userListPayload, {
      email: 'CASH@example.test',
      phone: '7777777777',
    }), {
      email: true,
      phone: true,
    });
  });

  test('normalizes Indian phone numbers before comparing', () => {
    const conflict = findUserIdentityConflict(userListPayload, {
      email: 'new@example.test',
      phone: '+91 99999 99999',
    });

    assert.equal(conflict.email, false);
    assert.equal(conflict.phone, true);
    assert.equal(hasUserIdentityConflict(conflict), true);
  });

  test('can exclude the current user when checking an edit flow', () => {
    assert.deepEqual(findUserIdentityConflict(userListPayload, {
      email: 'cash@example.test',
      phone: '8888888888',
      excludedUserId: '2',
    }), {
      email: false,
      phone: false,
    });
  });
});
