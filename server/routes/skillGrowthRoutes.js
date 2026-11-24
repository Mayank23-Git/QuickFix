import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createSkillGoal,
  deleteSkillGoal,
  generateAiRecommendations,
  getSkillGrowthCharts,
  getSkillGrowthDashboard,
  getStreakDetails,
  logLearningActivity,
  toggleRoadmapTopic,
  updateProfileLearningGoals,
  updateSkillGoal,
} from '../controllers/skillGrowthController.js';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', getSkillGrowthDashboard);
router.get('/charts', getSkillGrowthCharts);
router.get('/streak', getStreakDetails);
router.patch('/profile-goals', updateProfileLearningGoals);
router.post('/skills', createSkillGoal);
router.patch('/skills/:goalId', updateSkillGoal);
router.delete('/skills/:goalId', deleteSkillGoal);
router.patch('/skills/:goalId/topics/:topicId', toggleRoadmapTopic);
router.post('/activities', logLearningActivity);
router.post('/recommendations', generateAiRecommendations);

export default router;
