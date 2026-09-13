import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requirePunchSlug } from '../../middlewares/punchGate.js';
import { globalThrottle } from '../../middlewares/punchThrottle.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { punchController } from './punch.controller.js';
import { punchValidation } from './punch.validation.js';

const router = Router();

/**
 * The staff path is public by design — no session, no login, just a code on
 * whatever device is to hand.
 *
 * What protects it, in order: an unguessable slug, so the endpoint cannot be
 * found; a loose global backstop against a spread-out attempt; and, inside the
 * service, a per-address tarpit that slows wrong codes while always answering a
 * right one straight away.
 */
router.post(
  '/lookup',
  validateRequest(punchValidation.lookup),
  requirePunchSlug,
  globalThrottle,
  punchController.lookup,
);

router.post(
  '/',
  validateRequest(punchValidation.record),
  requirePunchSlug,
  globalThrottle,
  punchController.record,
);

/** Corrections. Manager only — these are the endpoints that can change pay. */
router.post(
  '/manager',
  requireAuth,
  requireRole('manager'),
  validateRequest(punchValidation.managerCreate),
  punchController.managerCreate,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('manager'),
  validateRequest(punchValidation.managerAmend),
  punchController.managerAmend,
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('manager'),
  validateRequest(punchValidation.managerVoid),
  punchController.managerVoid,
);

export const punchRoutes = router;
