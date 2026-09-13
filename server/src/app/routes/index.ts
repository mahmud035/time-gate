import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.route.js';

const router = Router();

const moduleRoutes: { path: string; routes: Router }[] = [
  { path: '/auth', routes: authRoutes },
];

for (const route of moduleRoutes) {
  router.use(route.path, route.routes);
}

export const apiRoutes = router;
