import { Router } from 'express';
import {
  claimAdminAccess,
  createBadge,
  getAdminBootstrapStatus,
  getAdminOverview,
  reviewFlaggedFeedback,
  reviewSpecialAchievementRequest,
  revokeCredential,
  updateAchievementRule,
  updateBadge,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();
const claimLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 8, keyPrefix: 'admin-claim' });

router.use(requireAuth);
router.get('/bootstrap-status', getAdminBootstrapStatus);
router.post('/claim', claimLimiter, claimAdminAccess);

// Strictly admin-only endpoints below
router.use(requireAdmin);
router.get('/overview', getAdminOverview);
router.post('/badges', createBadge);
router.patch('/badges/:id', updateBadge);
router.patch('/rules/:ruleKey', updateAchievementRule);
router.post('/requests/:id/review', reviewSpecialAchievementRequest);
router.post('/credentials/:credentialId/revoke', revokeCredential);
router.post('/feedback/:id/review', reviewFlaggedFeedback);

export default router;
