import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, getApiErrorMessage } from '@/api/axios.ts';
import type { ApiResponse } from '@/api/types.ts';

/**
 * Batch 1 diagnostic page (plan §3).
 *
 * Vercel does not document whether `Set-Cookie` survives an external rewrite,
 * and the entire auth design depends on it. This page proves it from the device
 * that matters — a real iPhone — before any feature is built on top.
 *
 * Deleted once the Batch 1 gate is green.
 */

type ProxyDiagnostics = {
  protocolSeenByExpress: string;
  secure: boolean;
  host: string | null;
  origin: string | null;
  forwarded: Record<string, string>;
};

type SetResult = {
  issuedAt: string;
  attributes: Record<string, unknown>;
  request: ProxyDiagnostics;
};

type ReadResult = {
  received: boolean;
  issuedAt: string | null;
  cookieNamesReceived: string[];
  request: ProxyDiagnostics;
};

type CheckOutcome = {
  passed: boolean;
  headline: string;
  detail: string;
  issued: SetResult;
  read: ReadResult;
  vercelCacheHeaders: string[];
};

const ProbePage = () => {
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useMutation({
    mutationFn: async (): Promise<CheckOutcome> => {
      const setResponse =
        await api.post<ApiResponse<SetResult>>('/_probe/set');
      const issued = setResponse.data.data;

      const readResponse = await api.get<ApiResponse<ReadResult>>(
        '/_probe/read',
      );
      const read = readResponse.data.data;

      // Same-origin, so every response header is readable. Repeated health
      // calls reveal whether Vercel is caching /api/* (gate item 4).
      const cacheHeaders: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        const health = await api.get('/health');
        cacheHeaders.push(
          String(health.headers['x-vercel-cache'] ?? 'not present'),
        );
      }

      const matched = read.received && read.issuedAt === issued.issuedAt;

      return {
        passed: matched,
        headline: matched
          ? 'PASS — cookies survive the proxy'
          : 'FAIL — the cookie did not come back',
        detail: matched
          ? 'HttpOnly, Secure, SameSite=Strict, host-only, Path=/api. The plan stands as written.'
          : 'Auth cannot use cookies on this topology. Fall back to serving the client from Railway (plan §9).',
        issued,
        read,
        vercelCacheHeaders: cacheHeaders,
      };
    },
    onSuccess: (result) => {
      setOutcome(result);
      setError(null);
    },
    onError: (mutationError: unknown) => {
      setOutcome(null);
      setError(getApiErrorMessage(mutationError, 'The probe request failed'));
    },
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-content-muted uppercase">
          TimeGate · Batch 1
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Cookie proxy probe</h1>
        <p className="mt-2 text-sm text-content-muted">
          Confirms that a cookie set by the API survives the Vercel rewrite, with
          the exact attributes the real auth cookies will use. Run this on the
          iPhone, not just the laptop.
        </p>
      </header>

      <button
        type="button"
        onClick={() => check.mutate()}
        disabled={check.isPending}
        className="w-full rounded-lg bg-brand px-4 py-3 font-medium text-brand-contrast disabled:opacity-60"
      >
        {check.isPending ? 'Running…' : 'Run the check'}
      </button>

      {check.isPending && (
        <div className="mt-6 space-y-3" aria-hidden>
          <div className="h-20 animate-pulse rounded-lg bg-surface-sunken" />
          <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />
        </div>
      )}

      {error !== null && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {outcome !== null && (
        <section className="mt-6 space-y-4">
          <div
            className={`rounded-lg border p-4 ${
              outcome.passed
                ? 'border-success/30 bg-success/5'
                : 'border-danger/30 bg-danger/5'
            }`}
          >
            <p
              className={`text-lg font-semibold ${
                outcome.passed ? 'text-success' : 'text-danger'
              }`}
            >
              {outcome.headline}
            </p>
            <p className="mt-1 text-sm text-content-muted">{outcome.detail}</p>
          </div>

          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h2 className="text-sm font-semibold">Vercel cache header</h2>
            <p className="mt-1 text-sm text-content-muted">
              Three consecutive calls to <code>/api/health</code>. Anything other
              than <code>MISS</code> or <code>not present</code> means{' '}
              <code>/api/*</code> is being cached and must be fixed.
            </p>
            <ul className="mt-2 font-mono text-sm">
              {outcome.vercelCacheHeaders.map((value, index) => (
                <li key={`${value}-${String(index)}`}>
                  call {index + 1}: {value}
                </li>
              ))}
            </ul>
          </div>

          <details className="rounded-lg border border-border bg-surface-raised p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Raw diagnostics
            </summary>
            <pre className="mt-3 overflow-x-auto text-xs text-content-muted">
              {JSON.stringify(
                { issued: outcome.issued, read: outcome.read },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
};

export default ProbePage;
