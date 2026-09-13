import { Delete } from 'lucide-react';
import { CODE_LENGTH } from '@/features/punch/punch.types.ts';

type CodePadProps = {
  value: string;
  /**
   * Emits the key that was pressed, never a computed next value.
   *
   * Sending `value + digit` would capture whatever `value` was when this render
   * happened, so two presses landing in one React batch would both build on the
   * same old string and one digit would vanish. The parent applies these with a
   * functional update, which composes correctly however fast they arrive.
   */
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
  shake?: boolean;
};

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/**
 * The one control staff touch, so it is built for a hurried tap on a shared
 * tablet rather than a careful click.
 *
 * Keys are far above the 44px minimum, there is no hover state to depend on,
 * and the entered code shows as dots — at an entrance the person behind you can
 * read digits off the screen.
 */
export const CodePad = ({
  value,
  onDigit,
  onBackspace,
  onClear,
  disabled,
  shake,
}: CodePadProps) => {
  const keyClass =
    'h-[4.5rem] rounded-xl border border-border bg-surface-raised text-3xl font-medium tabular ' +
    'transition-[background-color,transform] duration-100 active:scale-[0.97] active:bg-surface-sunken ' +
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
    'disabled:opacity-50 sm:h-24';

  return (
    <div>
      <div
        className={`mb-9 flex justify-center gap-5 ${shake ? 'animate-[shake_420ms_ease]' : ''}`}
        aria-hidden="true"
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <span
            key={index}
            className={
              index < value.length
                ? 'size-[1.125rem] rounded-full bg-brand'
                : 'size-[1.125rem] rounded-full border-2 border-border-strong'
            }
          />
        ))}
      </div>

      <div className="mx-auto grid max-w-[26rem] grid-cols-3 gap-3 sm:gap-4">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => onDigit(digit)}
            disabled={disabled}
            className={keyClass}
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={onClear}
          disabled={disabled || value.length === 0}
          className={`${keyClass} text-base! text-content-muted`}
        >
          Clear
        </button>

        <button type="button" onClick={() => onDigit('0')} disabled={disabled} className={keyClass}>
          0
        </button>

        <button
          type="button"
          onClick={onBackspace}
          disabled={disabled || value.length === 0}
          aria-label="Delete last digit"
          className={`${keyClass} flex items-center justify-center text-content-muted`}
        >
          <Delete className="size-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
