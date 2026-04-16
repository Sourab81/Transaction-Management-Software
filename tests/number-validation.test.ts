import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseNonNegativeNumber } from '../lib/number-validation';

describe('parseNonNegativeNumber', () => {
  test('accepts zero, integers, decimals, and trimmed values', () => {
    assert.equal(parseNonNegativeNumber('0'), 0);
    assert.equal(parseNonNegativeNumber('25'), 25);
    assert.equal(parseNonNegativeNumber('19.75'), 19.75);
    assert.equal(parseNonNegativeNumber('  42  '), 42);
  });

  test('rejects blank and whitespace values', () => {
    assert.equal(parseNonNegativeNumber(''), null);
    assert.equal(parseNonNegativeNumber('   '), null);
  });

  test('rejects negative values', () => {
    assert.equal(parseNonNegativeNumber('-1'), null);
    assert.equal(parseNonNegativeNumber('-0.01'), null);
  });

  test('rejects invalid or unsafe number values', () => {
    assert.equal(parseNonNegativeNumber('abc'), null);
    assert.equal(parseNonNegativeNumber('NaN'), null);
    assert.equal(parseNonNegativeNumber('Infinity'), null);
  });
});
