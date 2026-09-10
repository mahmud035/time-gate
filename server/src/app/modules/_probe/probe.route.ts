import { Router } from 'express';
import { probeController } from './probe.controller.js';

/**
 * Temporary Batch 1 diagnostic (plan §3). Two endpoints, no service and no
 * model, because it touches neither logic nor the database. This whole folder
 * is deleted once the cookie round trip is proven.
 */
const router = Router();

router.post('/set', probeController.setProbeCookie);
router.get('/read', probeController.readProbeCookie);

export const probeRoutes = router;
