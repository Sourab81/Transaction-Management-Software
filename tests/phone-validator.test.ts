import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
} from '../lib/validators/phone-validator';

describe('phone validator', () => {
  test('accepts valid 10 digit Indian mobile numbers', () => {
    assert.equal(isValidPhoneNumber('9876543210'), true);
    assert.equal(isValidPhoneNumber('+91 98765 43210'), true);
    assert.equal(normalizePhoneNumber('+91 98765 43210'), '9876543210');
  });

  test('rejects blank, short, and invalid starting digits', () => {
    assert.equal(isValidPhoneNumber(''), false);
    assert.equal(isValidPhoneNumber('12345'), false);
    assert.equal(isValidPhoneNumber('1234567890'), false);
  });
});
