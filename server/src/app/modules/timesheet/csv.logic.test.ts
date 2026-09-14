import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.logic.js';
import { msToDecimalHours, msToHoursMinutes, sumPayableMs } from './timesheet.logic.js';
import type { Shift } from './timesheet.interface.js';

const HOUR = 60 * 60 * 1000;

const shift = (payableMs: number): Shift => ({
  userId: 'u',
  date: '2026-06-10',
  clockIn: new Date(),
  clockOut: new Date(),
  clockInId: null,
  clockOutId: null,
  breaks: [],
  workedMs: payableMs,
  breakMs: 0,
  payableMs,
  status: 'complete',
  anomalies: [],
});

describe('toCsv', () => {
  it('opens with a BOM and separates rows with CRLF', () => {
    const csv = toCsv(['A', 'B'], [['1', '2']]);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿A,B\r\n1,2\r\n');
  });

  it('quotes cells containing a comma, a quote or a newline', () => {
    const csv = toCsv(['Name'], [['Smith, John'], ['He said "hi"'], ['two\nlines']]);

    expect(csv).toContain('"Smith, John"');
    expect(csv).toContain('"He said ""hi"""');
    expect(csv).toContain('"two\nlines"');
  });

  /**
   * Gate 17. This file gets opened by a manager on a work machine, so a cell
   * that a spreadsheet would treat as a formula is prefixed rather than trusted.
   */
  it('defuses cells a spreadsheet would run as a formula', () => {
    const csv = toCsv(
      ['Name'],
      [['=1+1'], ['+44 7700 900000'], ['-5'], ['@SUM(A1)']],
    );

    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+44 7700 900000");
    expect(csv).toContain("'-5");
    expect(csv).toContain("'@SUM(A1)");
    expect(csv).not.toMatch(/(^|[\r\n,])=1\+1/);
  });

  it('leaves ordinary values untouched', () => {
    expect(toCsv(['H'], [['Sakib'], ['7.75'], ['2026-06-10 09:00']])).toBe(
      '﻿H\r\nSakib\r\n7.75\r\n2026-06-10 09:00\r\n',
    );
  });
});

// Gate 17 — the number in the file must equal the number the shifts add up to.
describe('the exported total matches the millisecond sum', () => {
  it('rounds once, after summing, not per row', () => {
    const shifts = [shift(7.75 * HOUR), shift(6.5 * HOUR), shift(8 * HOUR)];
    const total = sumPayableMs(shifts);

    expect(total).toBe(22.25 * HOUR);

    const rows = shifts.map((s) => [msToDecimalHours(s.payableMs)]);
    const csv = toCsv(['Payable hours'], [...rows, [msToDecimalHours(total)]]);

    expect(csv).toContain('22.25');
    expect(msToHoursMinutes(total)).toBe('22:15');
  });

  it('excludes shifts that need review from the total', () => {
    const reviewed: Shift = { ...shift(0), status: 'needs-review', workedMs: 8 * HOUR };
    const total = sumPayableMs([shift(8 * HOUR), reviewed]);

    expect(total).toBe(8 * HOUR);
  });
});
