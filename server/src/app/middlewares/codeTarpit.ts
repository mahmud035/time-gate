/**
 * Slows down wrong codes without ever blocking a right one.
 *
 * A plain rate limiter refuses everything from an address once the limit is
 * hit, and a shared tablet at the entrance puts a whole workplace behind one
 * address — so thirty mistyped codes would lock the door for everybody. Nobody
 * is ever blocked at the door, so the penalty is attached to the failure itself:
 * a wrong code waits, a right one is answered immediately however bad the last
 * few minutes have been.
 *
 * A handful of attempts are free, because people mistype.
 *
 * This does not make a four-digit code strong, and it is not pretending to.
 * What keeps the code space out of reach is the slug on the punch page; this
 * makes sweeping it slow and conspicuous rather than instant, and the hard stop
 * is set where no real morning could reach it.
 */
const FREE_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const STEP_MS = 400;
const MAX_DELAY_MS = 4000;
/** Far above any plausible morning, and reached within seconds by a script. */
const HARD_STOP = 100;
/** Bounds memory if an attacker rotates addresses. */
const MAX_TRACKED = 10_000;

type Entry = { failures: number; expiresAt: number };

const attempts = new Map<string, Entry>();

const prune = (now: number): void => {
  for (const [key, entry] of attempts) {
    if (entry.expiresAt <= now) attempts.delete(key);
  }
};

const entryFor = (key: string, now: number): Entry => {
  const existing = attempts.get(key);

  if (existing && existing.expiresAt > now) return existing;

  if (attempts.size >= MAX_TRACKED) prune(now);

  const fresh = { failures: 0, expiresAt: now + WINDOW_MS };
  attempts.set(key, fresh);

  return fresh;
};

export type Penalty = { delayMs: number; blocked: boolean };

/** Records a wrong code and reports what it costs. */
export const registerFailure = (key: string, now = Date.now()): Penalty => {
  const entry = entryFor(key, now);
  entry.failures += 1;

  const over = entry.failures - FREE_ATTEMPTS;

  return {
    delayMs: over <= 0 ? 0 : Math.min(over * STEP_MS, MAX_DELAY_MS),
    blocked: entry.failures > HARD_STOP,
  };
};

/** A correct code clears the slate: the penalty only ever tracks failure. */
export const clearFailures = (key: string): void => {
  attempts.delete(key);
};

export const failureCount = (key: string, now = Date.now()): number => {
  const entry = attempts.get(key);

  return entry && entry.expiresAt > now ? entry.failures : 0;
};

/** Test seam. */
export const resetTarpit = (): void => attempts.clear();

export const wait = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
