import { Router } from 'express';
import { listSkills, suggestSkill } from '../controllers/skillController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', listSkills);
router.post('/suggest', requireAuth, suggestSkill);

export default router;
