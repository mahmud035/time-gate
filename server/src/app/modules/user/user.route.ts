import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { userController } from './user.controller.js';
import { userValidation } from './user.validation.js';

const router = Router();

/** Everything here is manager-only; staff never sign in. */
router.use(requireAuth, requireRole('manager'));

router.get('/', userController.list);
router.post('/', validateRequest(userValidation.createStaff), userController.create);
router.patch('/:id', validateRequest(userValidation.updateUser), userController.update);
router.post(
  '/:id/code',
  validateRequest(userValidation.byId),
  userController.resetCode,
);

export const userRoutes = router;
