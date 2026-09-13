import { describe, expect, it } from 'vitest';
import { AppError } from '../../utils/AppError.js';
import {
  deriveState,
  nextActions,
  punchesForAction,
  validateSequence,
  type PunchEvent,
} from './punch.logic.js';
import type { PunchAction, PunchState } from './punch.interface.js';
import { validateTransition } from './punch.logic.js';

const LIMIT_HOURS = 16;

/** `at` is written as a UTC instant; the timezone only matters for bucketing. */
const punch = (type: PunchEvent['type'], iso: string): PunchEvent => ({
  type,
  at: new Date(iso),
});

const refusal = (state: PunchState, action: PunchAction): AppError => {
  try {
    validateTransition(state, action);
  } catch (error) {
    return error as AppError;
  }

  throw new Error(`expected ${state} + ${action} to be refused`);
};

describe('deriveState', () => {
  const now = new Date('2026-06-10T12:00:00Z');

  it('reports clocked-out with no history at all', () => {
    expect(deriveState([], now, LIMIT_HOURS)).toBe('clocked-out');
  });

  it('follows clock-in, break and clock-out through every state', () => {
    const history: PunchEvent[] = [punch('clock-in', '2026-06-10T08:00:00Z')];
    expect(deriveState(history, now, LIMIT_HOURS)).toBe('clocked-in');

    history.push(punch('break-start', '2026-06-10T10:00:00Z'));
    expect(deriveState(history, now, LIMIT_HOURS)).toBe('on-break');

    history.push(punch('break-end', '2026-06-10T10:15:00Z'));
    expect(deriveState(history, now, LIMIT_HOURS)).toBe('clocked-in');

    history.push(punch('clock-out', '2026-06-10T11:00:00Z'));
    expect(deriveState(history, now, LIMIT_HOURS)).toBe('clocked-out');
  });

  it('is unaffected by the order punches arrive in', () => {
    const shuffled = [
      punch('break-end', '2026-06-10T10:15:00Z'),
      punch('clock-in', '2026-06-10T08:00:00Z'),
      punch('break-start', '2026-06-10T10:00:00Z'),
    ];

    expect(deriveState(shuffled, now, LIMIT_HOURS)).toBe('clocked-in');
  });

  // Gate 16 — a voided punch counts for nothing, anywhere.
  it('ignores a voided punch', () => {
    const history: PunchEvent[] = [
      punch('clock-in', '2026-06-10T08:00:00Z'),
      { ...punch('clock-out', '2026-06-10T09:00:00Z'), voidedAt: new Date() },
    ];

    expect(deriveState(history, now, LIMIT_HOURS)).toBe('clocked-in');
  });
});

// Gate 13 — the rule that stops yesterday blocking today.
describe('a stale open shift never blocks the door', () => {
  const clockedInYesterday = [punch('clock-in', '2026-06-09T09:00:00Z')];

  it('reports clocked-out once the shift outruns the limit', () => {
    const nextMorning = new Date('2026-06-10T08:00:00Z'); // 23h later

    expect(deriveState(clockedInYesterday, nextMorning, LIMIT_HOURS)).toBe(
      'clocked-out',
    );
  });

  it('still reports clocked-in while the shift is within the limit', () => {
    const sameEvening = new Date('2026-06-09T20:00:00Z'); // 11h later

    expect(deriveState(clockedInYesterday, sameEvening, LIMIT_HOURS)).toBe(
      'clocked-in',
    );
  });

  it('offers only "Clock in", and accepts it, the next morning', () => {
    const nextMorning = new Date('2026-06-10T08:00:00Z');
    const state = deriveState(clockedInYesterday, nextMorning, LIMIT_HOURS);

    expect(nextActions(state)).toEqual(['clock-in']);
    expect(() => validateTransition(state, 'clock-in')).not.toThrow();
  });

  it('treats a stale break the same way, not just a stale clock-in', () => {
    const onBreakYesterday = [
      punch('clock-in', '2026-06-09T09:00:00Z'),
      punch('break-start', '2026-06-09T13:00:00Z'),
    ];

    expect(
      deriveState(onBreakYesterday, new Date('2026-06-10T08:00:00Z'), LIMIT_HOURS),
    ).toBe('clocked-out');
  });
});

describe('nextActions', () => {
  it('offers exactly one thing when clocked out', () => {
    expect(nextActions('clocked-out')).toEqual(['clock-in']);
  });

  it('offers break and clock-out when clocked in', () => {
    expect(nextActions('clocked-in')).toEqual(['break-start', 'clock-out']);
  });

  /**
   * A bare clock-out is deliberately absent: it is accepted by the server but
   * never suggested, because it sends the shift to review for no good reason.
   */
  it('offers the two break endings, and never a bare clock-out', () => {
    expect(nextActions('on-break')).toEqual([
      'break-end',
      'break-end-and-clock-out',
    ]);
  });
});

describe('validateTransition', () => {
  // Gate 4
  it('refuses a second clock-in on a shift that is still fresh', () => {
    const error = refusal('clocked-in', 'clock-in');

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe("You're already clocked in.");
  });

  // Gate 5
  it('refuses a clock-out when no shift is open', () => {
    const error = refusal('clocked-out', 'clock-out');

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe("You're not clocked in yet.");
  });

  // Gate 6
  it('refuses a break-start while already on a break', () => {
    expect(refusal('on-break', 'break-start').statusCode).toBe(409);
  });

  it('refuses a break-end while not on a break', () => {
    expect(refusal('clocked-in', 'break-end').statusCode).toBe(409);
    expect(refusal('clocked-out', 'break-end').statusCode).toBe(409);
  });

  it('allows every action the screen offers, from every state', () => {
    for (const state of ['clocked-out', 'clocked-in', 'on-break'] as const) {
      for (const action of nextActions(state)) {
        expect(() => validateTransition(state, action)).not.toThrow();
      }
    }
  });

  /** Reachable by a manager edit, so refusing it would strand someone. */
  it('accepts a bare clock-out from a break even though it is not offered', () => {
    expect(() => validateTransition('on-break', 'clock-out')).not.toThrow();
  });
});

// Gate 15 — the compound action, in its pure half.
describe('punchesForAction', () => {
  it('writes one punch for an ordinary action', () => {
    expect(punchesForAction('clock-in')).toEqual(['clock-in']);
    expect(punchesForAction('clock-out')).toEqual(['clock-out']);
  });

  it('writes break-end then clock-out, in that order, for the compound action', () => {
    expect(punchesForAction('break-end-and-clock-out')).toEqual([
      'break-end',
      'clock-out',
    ]);
  });
});

// Gate: a manager edit producing an impossible sequence is rejected.
describe('validateSequence', () => {
  const seq = (...events: PunchEvent[]) => () =>
    validateSequence(events, LIMIT_HOURS);

  it('accepts an ordinary day with a break', () => {
    expect(
      seq(
        punch('clock-in', '2026-06-10T09:00:00Z'),
        punch('break-start', '2026-06-10T11:00:00Z'),
        punch('break-end', '2026-06-10T11:15:00Z'),
        punch('clock-out', '2026-06-10T17:00:00Z'),
      ),
    ).not.toThrow();
  });

  it('rejects a break-end with no break to end', () => {
    expect(
      seq(
        punch('clock-in', '2026-06-10T09:00:00Z'),
        punch('break-end', '2026-06-10T11:15:00Z'),
      ),
    ).toThrow(/impossible sequence/);
  });

  it('rejects a clock-out before any clock-in', () => {
    expect(seq(punch('clock-out', '2026-06-10T17:00:00Z'))).toThrow(
      /impossible sequence/,
    );
  });

  it('rejects a second clock-in inside a shift that is still fresh', () => {
    expect(
      seq(
        punch('clock-in', '2026-06-10T09:00:00Z'),
        punch('clock-in', '2026-06-10T10:00:00Z'),
      ),
    ).toThrow(/impossible sequence/);
  });

  it('refuses with 409, not a 500', () => {
    try {
      validateSequence([punch('break-start', '2026-06-10T09:00:00Z')], LIMIT_HOURS);
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as AppError).statusCode).toBe(409);
    }
  });

  /**
   * Someone forgot to clock out and simply started again the next morning.
   * That is an everyday occurrence, so the history it leaves must stay valid —
   * otherwise the manager could not correct anything else about that week.
   */
  it('accepts a fresh clock-in on top of a shift left open overnight', () => {
    expect(
      seq(
        punch('clock-in', '2026-06-09T09:00:00Z'),
        punch('clock-in', '2026-06-10T09:00:00Z'),
        punch('clock-out', '2026-06-10T17:00:00Z'),
      ),
    ).not.toThrow();
  });

  it('ignores voided punches when judging the sequence', () => {
    expect(
      seq(
        punch('clock-in', '2026-06-10T09:00:00Z'),
        { ...punch('clock-in', '2026-06-10T10:00:00Z'), voidedAt: new Date() },
        punch('clock-out', '2026-06-10T17:00:00Z'),
      ),
    ).not.toThrow();
  });
});
