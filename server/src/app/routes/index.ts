import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.route.js';
import { punchRoutes } from '../modules/punch/punch.route.js';
import { timesheetRoutes } from '../modules/timesheet/timesheet.route.js';
import { userRoutes } from '../modules/user/user.route.js';

const router = Router();

const moduleRoutes: { path: string; routes: Router }[] = [
  { path: '/auth', routes: authRoutes },
  { path: '/punch', routes: punchRoutes },
  { path: '/users', routes: userRoutes },
  { path: '/timesheet', routes: timesheetRoutes },
];

for (const route of moduleRoutes) {
  router.use(route.path, route.routes);
}

export const apiRoutes = router;
