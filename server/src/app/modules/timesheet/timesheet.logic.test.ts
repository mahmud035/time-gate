import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import type { PunchEvent } from '../punch/punch.logic.js';
import {
  msToDecimalHours,
  msToHoursMinutes,
  msToMinutes,
  pairShifts,
  sumPayableMs,
  weekRange,
} from './timesheet.logic.js';

const OPTIONS = { timezone: 'Europe/London', openShiftLimitHours: 16 };
const USER = 'user-1';
const HOUR = 60 * 60 * 1000;

/**
 * Builds a punch from a **London wall-clock** time, which is how a shift is
 * actually described by the people working it. Luxon resolves it to the correct
 * UTC instant, including across the clock changes.
 */
const at = (local: string): Date =>
  DateTime.fromISO(local, { zone: 'Europe/London' }).toJSDate();

const punch = (type: PunchEvent['type'], local: string): PunchEvent => ({
  type,
  at: at(local),
});

/** Far enough ahead that nothing under test is still "live". */
const LATER = new Date('2027-01-01T00:00:00Z');

const shiftsOf = (punches: PunchEvent[], now: Date = LATER) =>
  pairShifts(USER, punches, OPTIONS, now);

describe('a normal day', () => {
  // Gate 1
  it('pays the full span when there is no break', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-06-10T09:00'),
      punch('clock-out', '2026-06-10T17:00'),
    ]);

    expect(shift?.status).toBe('complete');
    expect(shift?.workedMs).toBe(8 * HOUR);
    expect(shift?.breakMs).toBe(0);
    expect(shift?.payableMs).toBe(8 * HOUR);
    expect(shift?.date).toBe('2026-06-10');
  });

  // Gate 2 — the example from Sakib's brief, worked through end to end.
  it('deducts an unpaid break: 09:00-17:00 with 15 minutes pays 7h45', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-06-10T09:00'),
      punch('break-start', '2026-06-10T11:00'),
      punch('break-end', '2026-06-10T11:15'),
      punch('clock-out', '2026-06-10T17:00'),
    ]);

    expect(shift?.workedMs).toBe(8 * HOUR);
    expect(shift?.breakMs).toBe(15 * 60 * 1000);
    expect(shift?.payableMs).toBe(7.75 * HOUR);
    expect(msToHoursMinutes(shift!.payableMs)).toBe('7:45');
    expect(shift?.status).toBe('complete');
  });

  // Gate 3
  it('deducts every break when there are several', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-06-10T09:00'),
      punch('break-start', '2026-06-10T11:00'),
      punch('break-end', '2026-06-10T11:15'),
      punch('break-start', '2026-06-10T13:00'),
      punch('break-end', '2026-06-10T13:45'),
      punch('clock-out', '2026-06-10T17:00'),
    ]);

    expect(shift?.breaks).toHaveLength(2);
    expect(shift?.breakMs).toBe(60 * 60 * 1000);
    expect(shift?.payableMs).toBe(7 * HOUR);
  });

  it('separates two shifts in one day', () => {
    const shifts = shiftsOf([
      punch('clock-in', '2026-06-10T09:00'),
      punch('clock-out', '2026-06-10T12:00'),
      punch('clock-in', '2026-06-10T17:00'),
      punch('clock-out', '2026-06-10T21:00'),
    ]);

    expect(shifts).toHaveLength(2);
    expect(sumPayableMs(shifts)).toBe(7 * HOUR);
  });
});

describe('time is measured in elapsed milliseconds, never wall clock', () => {
  // Gate 8
  it('attributes an overnight shift to the London date it began', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-06-10T22:00'),
      punch('clock-out', '2026-06-11T06:00'),
    ]);

    expect(shift?.date).toBe('2026-06-10');
    expect(shift?.payableMs).toBe(8 * HOUR);
  });

  /**
   * Gate 9. The clocks go forward at 01:00 on 29 March 2026, so this night is
   * genuinely an hour shorter. Paying 8h here would overpay.
   */
  it('pays 7h, not 8h, across the spring-forward night', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-03-28T22:00'),
      punch('clock-out', '2026-03-29T06:00'),
    ]);

    expect(shift?.payableMs).toBe(7 * HOUR);
    expect(msToHoursMinutes(shift!.payableMs)).toBe('7:00');
  });

  /**
   * Gate 10. The clocks go back at 02:00 on 25 October 2026. This is the case
   * wall-clock arithmetic gets wrong every year, silently underpaying an hour.
   */
  it('pays 9h, not 8h, across the autumn-back night', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-10-24T22:00'),
      punch('clock-out', '2026-10-25T06:00'),
    ]);

    expect(shift?.payableMs).toBe(9 * HOUR);
    expect(msToHoursMinutes(shift!.payableMs)).toBe('9:00');
  });

  // Gate 11 — the same rule has to hold for breaks, not just shifts.
  it('measures a break that spans the clock change as elapsed time', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-10-25T00:00'),
      punch('break-start', '2026-10-25T01:30+01:00'),
      punch('break-end', '2026-10-25T01:30Z'),
      punch('clock-out', '2026-10-25T06:00'),
    ]);

    // 01:30 BST to 01:30 GMT is the repeated hour: one real hour of break.
    expect(shift?.breakMs).toBe(1 * HOUR);
    expect(shift?.workedMs).toBe(7 * HOUR);
    expect(shift?.payableMs).toBe(6 * HOUR);
  });
});

// Gate 12
describe('weekRange buckets in local time, not UTC', () => {
  it('puts 00:30 BST on Monday into the week starting that Monday', () => {
    // 2026-03-30T00:30 London is 2026-03-29T23:30Z — Sunday in UTC, Monday here.
    const { start, end } = weekRange(at('2026-03-30T00:30'), {
      timezone: 'Europe/London',
      weekStart: 'monday',
    });

    expect(DateTime.fromJSDate(start, { zone: 'Europe/London' }).toISO()).toBe(
      DateTime.fromISO('2026-03-30T00:00', { zone: 'Europe/London' }).toISO(),
    );
    expect(start.toISOString()).toBe('2026-03-29T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-05T23:00:00.000Z');
  });

  it('treats Sunday as the last day of a Monday week, not the first', () => {
    const { start } = weekRange(at('2026-06-14T23:00'), {
      timezone: 'Europe/London',
      weekStart: 'monday',
    });

    expect(DateTime.fromJSDate(start, { zone: 'Europe/London' }).toISODate()).toBe(
      '2026-06-08',
    );
  });

  it('honours a Sunday week start', () => {
    const { start } = weekRange(at('2026-06-10T12:00'), {
      timezone: 'Europe/London',
      weekStart: 'sunday',
    });

    expect(DateTime.fromJSDate(start, { zone: 'Europe/London' }).toISODate()).toBe(
      '2026-06-07',
    );
  });
});

describe('shifts that need a human', () => {
  // Gate 13
  it('flags an open shift past the limit and pays nothing for it', () => {
    const [shift] = shiftsOf(
      [punch('clock-in', '2026-06-09T09:00')],
      at('2026-06-10T08:00'),
    );

    expect(shift?.status).toBe('needs-review');
    expect(shift?.anomalies).toEqual(['exceeds-limit']);
    expect(shift?.payableMs).toBe(0);
  });

  it('does not flag a shift that is simply still running', () => {
    const [shift] = shiftsOf(
      [punch('clock-in', '2026-06-10T09:00')],
      at('2026-06-10T12:00'),
    );

    expect(shift?.status).toBe('open');
    expect(shift?.anomalies).toEqual([]);
  });

  it('does not flag someone who is on their break right now', () => {
    const [shift] = shiftsOf(
      [
        punch('clock-in', '2026-06-10T09:00'),
        punch('break-start', '2026-06-10T11:00'),
      ],
      at('2026-06-10T11:05'),
    );

    expect(shift?.status).toBe('open');
    expect(shift?.anomalies).toEqual([]);
  });

  it('flags yesterday as missing a clock-out once today begins, and keeps today clean', () => {
    const shifts = shiftsOf(
      [
        punch('clock-in', '2026-06-09T09:00'),
        punch('clock-in', '2026-06-10T09:00'),
        punch('clock-out', '2026-06-10T17:00'),
      ],
      at('2026-06-10T18:00'),
    );

    expect(shifts).toHaveLength(2);
    expect(shifts[0]?.anomalies).toEqual(['missing-clock-out']);
    expect(shifts[0]?.payableMs).toBe(0);
    expect(shifts[1]?.status).toBe('complete');
    expect(shifts[1]?.payableMs).toBe(8 * HOUR);
    expect(sumPayableMs(shifts)).toBe(8 * HOUR);
  });

  /**
   * Gate 14. Closing the break at the clock-out instead would record a
   * six-hour unpaid break and quietly cost this person six hours' wages, on a
   * row that looks entirely normal.
   */
  it('sends an unclosed break to review rather than inventing a break-end', () => {
    const [shift] = shiftsOf([
      punch('clock-in', '2026-06-10T09:00'),
      punch('break-start', '2026-06-10T11:00'),
      punch('clock-out', '2026-06-10T17:00'),
    ]);

    expect(shift?.status).toBe('needs-review');
    expect(shift?.anomalies).toEqual(['unclosed-break']);
    expect(shift?.payableMs).toBe(0);
    expect(shift?.breaks[0]?.end).toBeNull();
    expect(shift?.breaks[0]?.ms).toBe(0);
    expect(shift?.workedMs).toBe(8 * HOUR);
  });

  // Gate 15 — the compound action's whole point: no review row.
  it('completes cleanly when the break is ended at the moment of clocking out', () => {
    const leaving = '2026-06-10T17:00';
    const [shift] = shiftsOf([
      punch('clock-in', '2026-06-10T09:00'),
      punch('break-start', '2026-06-10T11:00'),
      punch('break-end', leaving),
      punch('clock-out', leaving),
    ]);

    expect(shift?.status).toBe('complete');
    expect(shift?.anomalies).toEqual([]);
    expect(shift?.breakMs).toBe(6 * HOUR);
    expect(shift?.payableMs).toBe(2 * HOUR);
  });

  /**
   * Regression. `break-end-and-clock-out` writes both punches at one instant,
   * and a database sort on time alone leaves their order undefined — so the
   * same shift could read as complete or as an unclosed break depending on what
   * came back. Either order must produce the same, correct answer.
   */
  it('reads a same-instant break-end and clock-out correctly in either order', () => {
    const leaving = '2026-06-10T17:00';
    const start = punch('clock-in', '2026-06-10T09:00');
    const breakStart = punch('break-start', '2026-06-10T11:00');
    const breakEnd = punch('break-end', leaving);
    const clockOut = punch('clock-out', leaving);

    for (const order of [
      [start, breakStart, breakEnd, clockOut],
      [start, breakStart, clockOut, breakEnd],
      [clockOut, breakEnd, breakStart, start],
    ]) {
      const [shift] = shiftsOf(order);

      expect(shift?.status).toBe('complete');
      expect(shift?.anomalies).toEqual([]);
      expect(shift?.breakMs).toBe(6 * HOUR);
      expect(shift?.payableMs).toBe(2 * HOUR);
    }
  });

  // Gate 16
  it('ignores a voided punch when pairing', () => {
    const shifts = shiftsOf([
      punch('clock-in', '2026-06-10T09:00'),
      { ...punch('clock-out', '2026-06-10T12:00'), voidedAt: new Date() },
      punch('clock-out', '2026-06-10T17:00'),
    ]);

    expect(shifts).toHaveLength(1);
    expect(shifts[0]?.payableMs).toBe(8 * HOUR);
  });
});

describe('rounding happens once, at the end', () => {
  it('sums milliseconds before formatting, never the reverse', () => {
    // Three shifts of 2h20m01s. Rounded per shift then summed this reads 7:00;
    // summed then rounded it is 7:00:03 -> 7:00, and the decimal shows the drift.
    const oddMs = 2 * HOUR + 20 * 60 * 1000 + 1000;
    const total = oddMs * 3;

    expect(msToHoursMinutes(total)).toBe('7:00');
    expect(msToDecimalHours(total)).toBe('7.00');
    expect(msToMinutes(oddMs)).toBe(140);
  });

  it('formats a part hour correctly in both shapes', () => {
    expect(msToDecimalHours(7.75 * HOUR)).toBe('7.75');
    expect(msToHoursMinutes(7.75 * HOUR)).toBe('7:45');
    expect(msToHoursMinutes(45 * 60 * 1000)).toBe('0:45');
  });
});
