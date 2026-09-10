import { createBrowserRouter, Navigate } from 'react-router';
import DashboardPage from '@/pages/DashboardPage.tsx';
import LoginPage from '@/pages/LoginPage.tsx';
import ProbePage from '@/pages/ProbePage.tsx';
import { ProtectedRoute } from './ProtectedRoute.tsx';

/**
 * Batch 1 routes only. The kiosk, phone linking, timesheets and reports arrive
 * in their own batches.
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  { path: '/probe', element: <ProbePage /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
