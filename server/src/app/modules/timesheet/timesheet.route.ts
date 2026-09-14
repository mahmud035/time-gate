import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { timesheetController } from './timesheet.controller.js';
import { timesheetValidation } from './timesheet.validation.js';

const router = Router();

router.use(requireAuth, requireRole('manager'));

router.get('/today', timesheetController.today);
router.get('/', validateRequest(timesheetValidation.range), timesheetController.list);
router.get(
  '/export',
  validateRequest(timesheetValidation.range),
  timesheetController.exportCsv,
);

export const timesheetRoutes = router;
