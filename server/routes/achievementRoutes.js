import { Router } from 'express';
import {
  getMyAchievementsDashboard,
  redeemBadge,
  submitSpecialAchievementRequest,
  verifyPublicCredential,
} from '../controllers/achievementController.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const redeemLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15, keyPrefix: 'redeem' });
const requestLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 8, keyPrefix: 'special-req' });

router.use(requireAuth);
router.get('/me', getMyAchievementsDashboard);
router.post('/badges/:badgeId/redeem', redeemLimiter, redeemBadge);
router.post('/requests', requestLimiter, submitSpecialAchievementRequest);

export default router;

export const publicVerifyRouter = Router();
const verifyLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60, keyPrefix: 'verify' });
publicVerifyRouter.get('/:credentialId', verifyLimiter, verifyPublicCredential);
