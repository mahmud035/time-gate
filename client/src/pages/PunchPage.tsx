import { Check, Clock, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { getApiErrorMessage } from '@/api/axios.ts';
import { CodePad } from '@/components/ui/CodePad.tsx';
import {
  ACTION_DONE,
  ACTION_LABEL,
  STATE_LABEL,
  stateDetail,
} from '@/features/punch/punch.copy.ts';
import { useLookup, usePunch } from '@/features/punch/punch.hooks.ts';
import {
  CODE_LENGTH,
  type PunchAction,
  type StaffStatus,
} from '@/features/punch/punch.types.ts';
import { useOnline } from '@/hooks/useOnline.ts';
import { formatDuration } from '@/utils/duration.ts';
import { londonLongDate, londonTime } from '@/utils/time.ts';

/** Long enough to read the confirmation, short enough not to hold up a queue. */
const RETURN_AFTER_MS = 6000;

type Screen =
  | { kind: 'entry' }
  | { kind: 'identified'; status: StaffStatus }
  | { kind: 'confirmed'; title: string; at: string; status: StaffStatus };

const useClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(id);
  }, []);

  return now;
};

const PunchPage = () => {
  const { slug = '' } = useParams();
  const now = useClock();
  const online = useOnline();

  const [code, setCode] = useState('');
  const [screen, setScreen] = useState<Screen>({ kind: 'entry' });
  const [shake, setShake] = useState(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = useLookup();
  const punch = usePunch();

  const reset = () => {
    if (returnTimer.current) clearTimeout(returnTimer.current);
    setCode('');
    setScreen({ kind: 'entry' });
    setShake(false);
    lookup.reset();
    punch.reset();
  };

  useEffect(() => () => {
    if (returnTimer.current) clearTimeout(returnTimer.current);
  }, []);

  /**
   * Four digits is the whole code, so it submits itself. Asking for a
   * confirming tap would add a step to the thing people do twice a day.
   */
  useEffect(() => {
    if (code.length !== CODE_LENGTH || screen.kind !== 'entry') return;

    lookup.mutate(
      { slug, code },
      {
        onSuccess: (status) => setScreen({ kind: 'identified', status }),
        onError: () => {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setCode('');
          }, 420);
        },
      },
    );
    // Deliberately keyed on the code and the screen only. Widening this to
    // every value the effect reads would re-fire it on each render of the same
    // code — and re-firing a submit is how one entry becomes two lookups.
  }, [code, screen.kind]);

  const act = (action: PunchAction) => {
    if (screen.kind !== 'identified') return;

    punch.mutate(
      {
        slug,
        code,
        action,
        // One key per tap. A retry of this tap replays the original punch
        // instead of writing a second one.
        idempotencyKey: crypto.randomUUID(),
      },
      {
        onSuccess: (result) => {
          setScreen({
            kind: 'confirmed',
            title: ACTION_DONE[action],
            at: result.at,
            status: result,
          });
          setCode('');
          returnTimer.current = setTimeout(reset, RETURN_AFTER_MS);
        },
      },
    );
  };

  const busy = lookup.isPending || punch.isPending;

  const primaryButton =
    'h-16 w-full rounded-xl bg-brand text-lg font-semibold text-brand-contrast ' +
    'transition-[filter,transform] duration-100 hover:brightness-110 active:scale-[0.99] ' +
    'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand ' +
    'disabled:opacity-60';
  const secondaryButton =
    'h-16 w-full rounded-xl border border-border-strong bg-surface-raised text-lg font-semibold ' +
    'transition-colors duration-100 hover:bg-surface-sunken active:scale-[0.99] ' +
    'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand ' +
    'disabled:opacity-60';

  return (
    <main className="flex min-h-dvh flex-col px-5 py-6 sm:px-12 sm:py-10">
      <header className="flex items-baseline justify-between">
        <div className="flex items-center gap-2.5">
          <Clock className="size-5 text-brand" aria-hidden="true" />
          <span className="font-semibold tracking-tight">TimeGate</span>
        </div>
        <div className="text-right">
          <div className="tabular text-2xl font-semibold tracking-tight sm:text-3xl">
            {londonTime(now)}
          </div>
          <div className="text-sm text-content-muted">{londonLongDate(now)}</div>
        </div>
      </header>

      {/* Installed, the page loads from cache with no connection — so the
          absence of one has to be said out loud rather than discovered when a
          punch fails. The keypad is disabled because nothing can be recorded. */}
      {!online && (
        <div
          role="status"
          className="mt-5 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3.5"
        >
          <WifiOff className="size-5 flex-shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm font-medium sm:text-base">
            No connection — clocking in and out is paused. Tell your manager if this
            does not clear.
          </p>
        </div>
      )}

      <div className="flex flex-grow flex-col justify-center py-8">
        {screen.kind === 'entry' && (
          <div>
            <div className="mb-9 text-center">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Enter your code
              </h1>
              <p
                className="mt-2.5 min-h-6 text-base text-content-muted sm:text-lg"
                role={lookup.isError ? 'alert' : undefined}
              >
                {lookup.isError
                  ? getApiErrorMessage(lookup.error, "That code isn't recognised.")
                  : 'Your 4-digit code'}
              </p>
            </div>
            <CodePad
              value={code}
              /**
               * Functional updates, so two presses arriving in the same React
               * batch cannot both build on the same stale string.
               */
              onDigit={(digit) =>
                setCode((current) =>
                  current.length >= CODE_LENGTH ? current : current + digit,
                )
              }
              onBackspace={() => setCode((current) => current.slice(0, -1))}
              onClear={() => setCode('')}
              disabled={busy || !online}
              shake={shake}
            />
          </div>
        )}

        {screen.kind === 'identified' && (
          <div className="text-center">
            <p className="text-sm font-semibold tracking-[0.08em] text-content-muted uppercase">
              {STATE_LABEL[screen.status.state]}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              {screen.status.name}
            </h1>
            <p className="mt-3.5 text-lg text-content-muted">
              {stateDetail(screen.status.state, screen.status.since)}
            </p>

            <div className="mx-auto mt-10 flex max-w-[26rem] flex-col gap-3.5">
              {screen.status.nextActions.map((action, index) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => act(action)}
                  disabled={busy}
                  className={index === 0 ? primaryButton : secondaryButton}
                >
                  {punch.isPending ? 'Saving…' : ACTION_LABEL[action]}
                </button>
              ))}

              {punch.isError && (
                <p
                  role="alert"
                  className="rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-base text-danger"
                >
                  {getApiErrorMessage(punch.error, 'That did not go through')}
                </p>
              )}

              <button
                type="button"
                onClick={reset}
                className="mt-1 p-2.5 text-base text-content-muted"
              >
                Not you? Start again
              </button>
            </div>
          </div>
        )}

        {screen.kind === 'confirmed' && (
          <div className="text-center" role="status" aria-live="polite">
            <div className="mx-auto mb-7 flex size-20 items-center justify-center rounded-full bg-success/10 sm:size-24">
              <Check className="size-10 text-success sm:size-12" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {screen.title}
            </h1>
            <p className="tabular mt-4 text-xl text-content-muted sm:text-2xl">
              {londonTime(screen.at)} · {londonLongDate(screen.at)}
            </p>

            <div className="mx-auto mt-9 max-w-[26rem] rounded-2xl border border-border bg-surface-raised p-6">
              <div className="text-xs font-semibold tracking-[0.08em] text-content-muted uppercase">
                Your week so far
              </div>
              <div className="tabular mt-2.5 text-4xl font-semibold tracking-tight">
                {formatDuration(screen.status.weekToDatePayableMs)}
              </div>
              <p className="mt-1.5 text-sm text-content-muted">
                Finished shifts only, breaks already taken off
              </p>
            </div>

            <div className="mx-auto mt-6 max-w-[26rem]">
              <button type="button" onClick={reset} className={secondaryButton}>
                Done
              </button>
              <p className="mt-4 text-sm text-content-muted">Returning to the keypad</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default PunchPage;
