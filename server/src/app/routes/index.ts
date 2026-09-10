import { Router } from 'express';
import { probeRoutes } from '../modules/_probe/probe.route.js';
import { authRoutes } from '../modules/auth/auth.route.js';

const router = Router();

const moduleRoutes: { path: string; routes: Router }[] = [
  { path: '/auth', routes: authRoutes },
  { path: '/_probe', routes: probeRoutes },
];

for (const route of moduleRoutes) {
  router.use(route.path, route.routes);
}

export const apiRoutes = router;
