import { createBrowserRouter, Navigate } from 'react-router';
import DashboardPage from '@/pages/DashboardPage.tsx';
import LoginPage from '@/pages/LoginPage.tsx';
import { ProtectedRoute } from './ProtectedRoute.tsx';

/**
 * Batch 1 routes only. The punch screen arrives in Batch 3, the manager
 * dashboard in Batch 4.
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
  { path: '*', element: <Navigate to="/login" replace /> },
]);
