import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import HomePage from '@/pages/HomePage.tsx';
import PunchPage from '@/pages/PunchPage.tsx';
import { ProtectedRoute } from './ProtectedRoute.tsx';

/**
 * The punch screen is the only one loaded on a shared tablet over whatever
 * connection the entrance has, and it is loaded before someone can start work.
 * So it ships eagerly and the manager's side — which brings the form, dialog
 * and validation stack with it — is split out behind these boundaries.
 */
const LoginPage = lazy(() => import('@/pages/LoginPage.tsx'));
const TodayPage = lazy(() => import('@/pages/dashboard/TodayPage.tsx'));
const RecordsPage = lazy(() => import('@/pages/dashboard/RecordsPage.tsx'));
const StaffPage = lazy(() => import('@/pages/dashboard/StaffPage.tsx'));

const Loading = () => (
  <div className="flex min-h-dvh items-center justify-center px-5">
    <div className="w-full max-w-sm space-y-3" aria-hidden="true">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-12 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-12 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
    <span className="sr-only">Loading</span>
  </div>
);

const deferred = (element: ReactNode) => <Suspense fallback={<Loading />}>{element}</Suspense>;

const guarded = (element: ReactNode) =>
  deferred(<ProtectedRoute>{element}</ProtectedRoute>);

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  /**
   * The slug is the gate on the staff path: it keeps a four-digit code from
   * being enumerated by anyone who finds the domain. The server checks it — the
   * route only carries it.
   */
  { path: '/p/:slug', element: <PunchPage /> },
  { path: '/login', element: deferred(<LoginPage />) },
  { path: '/dashboard', element: guarded(<TodayPage />) },
  { path: '/dashboard/records', element: guarded(<RecordsPage />) },
  { path: '/dashboard/staff', element: guarded(<StaffPage />) },
  { path: '*', element: <HomePage /> },
]);
