import { createBrowserRouter, Navigate } from 'react-router';
import ProbePage from '@/pages/ProbePage.tsx';

/**
 * Batch 1 carries the diagnostic route only. The kiosk, phone, login and
 * dashboard routes land in their own batches.
 */
export const router = createBrowserRouter([
  { path: '/probe', element: <ProbePage /> },
  { path: '*', element: <Navigate to="/probe" replace /> },
]);
