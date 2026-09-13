const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Hours and minutes, the way a payslip reads them.
 *
 * Rounds once, at the end, from a millisecond total — never by summing values
 * that were each rounded first.
 */
export const formatDuration = (ms: number): string => {
  const totalMinutes = Math.round(ms / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};

export const formatHoursMinutes = (ms: number): string => {
  const totalMinutes = Math.round(ms / MINUTE_MS);

  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`;
};

export const hoursOf = (ms: number): number => ms / HOUR_MS;
