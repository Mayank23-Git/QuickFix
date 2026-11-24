import { Router } from 'express';
import {
  getDashboardData,
  getStudentProfile,
  listStudents,
  removeMySkill,
  updateMyProfile,
  updateMyThemePreference,
  upsertMySkill,
} from '../controllers/userController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listStudents);
router.get('/me/dashboard', requireAuth, getDashboardData);
router.patch('/me', requireAuth, updateMyProfile);
router.patch('/me/theme', requireAuth, updateMyThemePreference);
router.post('/me/skills', requireAuth, upsertMySkill);
router.delete('/me/skills/:skillId', requireAuth, removeMySkill);
router.get('/:id', optionalAuth, getStudentProfile);
router.put('/:id', requireAuth, updateMyProfile);

export default router;
