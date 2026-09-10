import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { authController } from './auth.controller.js';
import { authValidation } from './auth.validation.js';

const router = Router();

router.post(
  '/login',
  validateRequest(authValidation.login),
  authController.login,
);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);

export const authRoutes = router;
