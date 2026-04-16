import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildCsv, escapeCsvValue } from '../lib/csv';

describe('escapeCsvValue', () => {
  test('keeps simple values unchanged', () => {
    assert.equal(escapeCsvValue('John Doe'), 'John Doe');
    assert.equal(escapeCsvValue(250), '250');
    assert.equal(escapeCsvValue(null), '');
    assert.equal(escapeCsvValue(undefined), '');
  });

  test('quotes commas, quotes, new lines, and edge spaces', () => {
    assert.equal(escapeCsvValue('John, Doe'), '"John, Doe"');
    assert.equal(escapeCsvValue('He said "hello"'), '"He said ""hello"""');
    assert.equal(escapeCsvValue('Line 1\nLine 2'), '"Line 1\nLine 2"');
    assert.equal(escapeCsvValue(' padded '), '" padded "');
  });

  test('prefixes risky spreadsheet formula values', () => {
    assert.equal(escapeCsvValue('=1+1'), "'=1+1");
    assert.equal(escapeCsvValue('+SUM(A1:A2)'), "'+SUM(A1:A2)");
    assert.equal(escapeCsvValue('-10'), "'-10");
    assert.equal(escapeCsvValue('@cmd'), "'@cmd");
  });

  test('keeps leading whitespace while neutralizing formula values', () => {
    assert.equal(escapeCsvValue('  =1+1'), "\"  '=1+1\"");
  });
});

describe('buildCsv', () => {
  test('builds escaped CSV rows with CRLF line endings', () => {
    const csv = buildCsv([
      ['Name', 'Note'],
      ['John, Doe', 'He said "hello"'],
      ['Formula', '=1+1'],
    ]);

    assert.equal(csv, 'Name,Note\r\n"John, Doe","He said ""hello"""\r\nFormula,\'=1+1');
  });
});
