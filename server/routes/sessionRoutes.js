import { Router } from 'express';
import {
  cancelSession,
  completeSession,
  getSessionById,
  listMySessions,
  readySession,
  startSession,
  submitSessionFeedback,
} from '../controllers/sessionController.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const feedbackLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10, keyPrefix: 'feedback' });

router.use(requireAuth);
router.get('/', listMySessions);
router.get('/:id', getSessionById);
router.post('/:id/ready', readySession);
router.post('/:id/start', startSession);
router.post('/:id/complete', completeSession);
router.post('/:id/cancel', cancelSession);
router.post('/:id/feedback', feedbackLimiter, submitSessionFeedback);

export default router;
