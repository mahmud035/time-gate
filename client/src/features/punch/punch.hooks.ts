import { useMutation } from '@tanstack/react-query';
import { punchApi } from './punch.api.ts';
import type { PunchAction } from './punch.types.ts';

/**
 * No caching and no retries anywhere on this path.
 *
 * A stale status would offer an action the server has since stopped accepting,
 * and an automatic retry of a write is how one tap becomes two punches. The
 * idempotency key makes a *deliberate* retry safe; it does not make a silent
 * one correct.
 */
export const useLookup = () =>
  useMutation({
    mutationFn: ({ slug, code }: { slug: string; code: string }) =>
      punchApi.lookup(slug, code),
    retry: false,
  });

export const usePunch = () =>
  useMutation({
    mutationFn: (input: {
      slug: string;
      code: string;
      action: PunchAction;
      idempotencyKey: string;
    }) => punchApi.punch(input),
    retry: false,
  });
