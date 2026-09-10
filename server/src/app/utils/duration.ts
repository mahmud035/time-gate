const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export const DURATION_PATTERN = /^\d+[smhd]$/;

/**
 * Converts "15m" / "7d" to milliseconds.
 *
 * Opaque refresh and device tokens are not JWTs, so their expiry has to be
 * computed here rather than left to a token library. Deliberately tiny and
 * local — no dependency, and no reliance on a transitive one.
 */
export const parseDuration = (value: string): number => {
  if (!DURATION_PATTERN.test(value)) {
    throw new Error(
      `Invalid duration "${value}". Expected a number followed by s, m, h or d.`,
    );
  }

  const amount = Number(value.slice(0, -1));
  const unit = value.slice(-1);
  const unitMs = UNIT_MS[unit];

  if (unitMs === undefined) {
    throw new Error(`Unknown duration unit "${unit}"`);
  }

  return amount * unitMs;
};
