import { Router } from 'express';
import {
  claimRequest,
  createRequest,
  deleteRequest,
  getRequestById,
  listRequests,
  updateRequest,
} from '../controllers/requestController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listRequests);
router.get('/:id', optionalAuth, getRequestById);
router.post('/', requireAuth, createRequest);
router.patch('/:id', requireAuth, updateRequest);
router.delete('/:id', requireAuth, deleteRequest);
router.post('/:id/claim', requireAuth, claimRequest);

export default router;
