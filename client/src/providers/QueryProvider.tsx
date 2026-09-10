import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * All server state goes through TanStack Query.
 *
 * `retry: false` is deliberate for a punch clock: a silent retry of a failed
 * write is exactly how duplicate punches happen. Writes are retried explicitly,
 * with an idempotency key, never automatically.
 */
export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
