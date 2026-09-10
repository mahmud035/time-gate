import { Router } from 'express';
import { probeRoutes } from '../modules/_probe/probe.route.js';

const router = Router();

const moduleRoutes: { path: string; routes: Router }[] = [
  { path: '/_probe', routes: probeRoutes },
];

for (const route of moduleRoutes) {
  router.use(route.path, route.routes);
}

export const apiRoutes = router;
