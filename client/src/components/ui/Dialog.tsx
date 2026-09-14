import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Radix rather than hand-rolled.
 *
 * Focus trapping, focus restoration on close, scroll locking, Escape handling
 * and `aria-modal` are each easy to get subtly wrong and invisible when you do —
 * and this dialog is where wages get corrected, so it is the wrong place to
 * find out a screen reader never announced it.
 */
export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DialogProps) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-content/40 backdrop-blur-[1px]" />
      <RadixDialog.Content
        className="fixed top-1/2 left-1/2 max-h-[90dvh] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface-raised shadow-2xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-0">
          <div>
            <RadixDialog.Title className="text-lg font-semibold tracking-tight">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1.5 text-sm text-content-muted">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close
            aria-label="Close"
            className="-mt-1 -mr-1 rounded-lg p-1.5 text-content-muted transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <X className="size-5" aria-hidden="true" />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);
