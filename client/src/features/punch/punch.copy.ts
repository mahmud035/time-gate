import type { PunchAction, PunchState } from './punch.types.ts';

/**
 * Every word staff read at the door lives here.
 *
 * Plain English, never a status code and never the word "invalid" — the person
 * in front of the tablet is trying to start work, not debug an API.
 */
export const ACTION_LABEL: Record<PunchAction, string> = {
  'clock-in': 'Clock in',
  'break-start': 'Start break',
  'break-end': 'End break',
  'clock-out': 'Clock out',
  'break-end-and-clock-out': 'End break & clock out',
};

/** What the confirmation screen announces after the punch lands. */
export const ACTION_DONE: Record<PunchAction, string> = {
  'clock-in': 'Clocked in',
  'break-start': 'Break started',
  'break-end': 'Back from break',
  'clock-out': 'Clocked out',
  'break-end-and-clock-out': 'Clocked out',
};

export const STATE_LABEL: Record<PunchState, string> = {
  'clocked-out': 'Not clocked in',
  'clocked-in': 'Clocked in',
  'on-break': 'On a break',
};

export const stateDetail = (state: PunchState, since: string | null): string => {
  if (state === 'clocked-out') return 'Tap below to start your shift';

  const at = since
    ? new Date(since).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (state === 'on-break') {
    return at ? `Break started at ${at}` : 'Break in progress';
  }

  return at ? `Working since ${at}` : 'Shift in progress';
};
