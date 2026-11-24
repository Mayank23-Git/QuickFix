import { User } from '../models/User.js';
import { UserSkill } from '../models/UserSkill.js';
import { HelpRequest } from '../models/HelpRequest.js';
import { HelpSession } from '../models/HelpSession.js';
import { computeSkillBadges } from '../services/badgeService.js';

export async function getLeaderboard(req, res) {
  try {
    const [topUsers, totalCompletedSessions, totalOpenDoubts, totalStudents] = await Promise.all([
      User.find()
        .select('fullName avatarUrl college branch academicYear contributionPoints completedSessions isDemo createdAt')
        .sort({ contributionPoints: -1, completedSessions: -1, createdAt: 1 })
        .limit(25)
        .lean(),
      HelpSession.countDocuments({ status: 'Completed' }),
      HelpRequest.countDocuments({ status: 'Open' }),
      User.countDocuments(),
    ]);

    const userIds = topUsers.map((u) => u._id);
    const userSkills = await UserSkill.find({ userId: { $in: userIds } })
      .populate('skillId', 'name slug')
      .lean();

    const skillsByUser = new Map();
    for (const us of userSkills) {
      const uid = String(us.userId);
      if (!skillsByUser.has(uid)) skillsByUser.set(uid, []);
      if (us.skillId) {
        skillsByUser.get(uid).push({
          _id: us.skillId._id,
          name: us.skillId.name,
          proficiency: us.proficiency,
        });
      }
    }

    const leaderboard = topUsers.map((user, index) => {
      const skills = skillsByUser.get(String(user._id)) || [];
      return {
        rank: index + 1,
        ...user,
        skills: skills.slice(0, 4),
        badges: computeSkillBadges(user, skills),
      };
    });

    return res.json({
      leaderboard,
      stats: {
        totalCompletedSessions,
        totalOpenDoubts,
        totalStudents,
      },
    });
  } catch (error) {
    console.error('[Leaderboard Error]', error);
    return res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
}
