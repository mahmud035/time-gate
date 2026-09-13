import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import HomePage from '@/pages/HomePage.tsx';
import PunchPage from '@/pages/PunchPage.tsx';
import { ProtectedRoute } from './ProtectedRoute.tsx';

/**
 * The punch screen is the only one loaded on a shared tablet over whatever
 * connection the entrance has, and it is loaded before someone can start work.
 * So it ships eagerly and the manager's side — which brings the form and
 * validation stack with it — is split out behind these boundaries.
 */
const LoginPage = lazy(() => import('@/pages/LoginPage.tsx'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage.tsx'));

const Loading = () => (
  <div className="flex min-h-dvh items-center justify-center px-5">
    <div className="w-full max-w-sm space-y-3" aria-hidden="true">
      <div className="h-8 w-40 rounded-lg bg-surface-sunken" />
      <div className="h-12 rounded-lg bg-surface-sunken" />
      <div className="h-12 rounded-lg bg-surface-sunken" />
    </div>
    <span className="sr-only">Loading</span>
  </div>
);

const deferred = (element: React.ReactNode) => (
  <Suspense fallback={<Loading />}>{element}</Suspense>
);

/**
 * The manager dashboard arrives in Batch 4; `/dashboard` is still a placeholder.
 */
export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  /**
   * The slug is the gate on the staff path: it keeps a four-digit code from
   * being enumerated by anyone who finds the domain. The server checks it — the
   * route only carries it.
   */
  { path: '/p/:slug', element: <PunchPage /> },
  { path: '/login', element: deferred(<LoginPage />) },
  {
    path: '/dashboard',
    element: deferred(
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>,
    ),
  },
  { path: '*', element: <HomePage /> },
]);
