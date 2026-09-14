/**
 * Every time this app shows or accepts is London time, on every device.
 *
 * The hours belong to a UK workplace, so the timezone is a property of the
 * business, not of whoever is looking. Left to the browser's own zone, a
 * manager abroad reads a 09:00 shift as 14:00 — and far worse, the correction
 * dialog would seed its input with their local wall clock while the server
 * reads that same string back as London, quietly moving a punch by hours.
 *
 * `Intl` does this without pulling a date library into the client bundle.
 */
const ZONE = 'Europe/London';

const parts = (value: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { ...options, timeZone: ZONE }).formatToParts(value);

const partsMap = (value: Date, options: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(parts(value, options).map((part) => [part.type, part.value]));

const asDate = (value: string | Date): Date =>
  value instanceof Date ? value : new Date(value);

/** `09:00`, always London. */
export const londonTime = (value: string | Date | null): string =>
  value === null
    ? ''
    : new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: ZONE,
      }).format(asDate(value));

/** `Mon 7 Sep`, always London. */
export const londonShortDate = (value: string | Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: ZONE,
  }).format(asDate(value));

/** `Monday 7 September`, always London. */
export const londonLongDate = (value: string | Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONE,
  }).format(asDate(value));

/** `2026-09-07`, the London calendar day an instant falls on. */
export const londonIsoDate = (value: string | Date): string => {
  const p = partsMap(asDate(value), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return `${p.year}-${p.month}-${p.day}`;
};

/**
 * What a `datetime-local` input expects — and the exact string the server reads
 * back as London time, so what the manager sees is what gets stored.
 */
export const toLondonInputValue = (value: string | Date): string => {
  const p = partsMap(asDate(value), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Midnight can come back as "24" from some engines; the input wants "00".
  const hour = p.hour === '24' ? '00' : p.hour;

  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
};

/**
 * Date-only arithmetic, done in UTC on a plain `YYYY-MM-DD`.
 *
 * Adding days to a `Date` in the browser's own zone silently gains or loses an
 * hour across a clock change, which is how a week picker ends up starting on a
 * Sunday twice a year.
 */
export const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

/** The Monday of the London week containing this instant, matching PAY_WEEK_START. */
export const londonWeekStart = (value: string | Date = new Date()): string => {
  const today = londonIsoDate(value);
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;

  return addDays(today, -weekday);
};

/** `Mon 7 Sep` from a plain `YYYY-MM-DD`, with no timezone shifting applied. */
export const isoToShortDate = (isoDate: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
