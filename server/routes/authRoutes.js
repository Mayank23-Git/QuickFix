import { Router } from 'express';
import { getMe, login, logout, signup } from '../controllers/authController.js';
import { requireAuth, verifyCsrfHeaderOrOrigin } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/logout', verifyCsrfHeaderOrOrigin, logout);

export default router;
