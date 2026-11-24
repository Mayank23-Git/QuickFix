import crypto from 'crypto';
import { BadgeDefinition } from '../models/BadgeDefinition.js';
import { UserBadge } from '../models/UserBadge.js';
import { CredentialVerification } from '../models/CredentialVerification.js';
import { User } from '../models/User.js';
import { LearningActivity } from '../models/LearningActivity.js';
import { SkillGoal } from '../models/SkillGoal.js';
import { awardVerifiedXp, ensureAchievementCatalog } from './xpService.js';

async function awardMilestoneBadgeOnce({ userId, badgeId, fullName, currentXp }) {
  const badgeDef = await BadgeDefinition.findOne({ badgeId, active: true }).lean();
  if (!badgeDef) return null;

  const existing = await UserBadge.findOne({ userId, badgeId: badgeDef.badgeId }).lean();
  if (existing) return null;

  const year = new Date().getFullYear();
  const randHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const randHex2 = crypto.randomBytes(4).toString('hex').toUpperCase();
  const achievementId = `ACH-QF-${year}-${randHex}`;
  const credentialId = `QF-${year}-${randHex2}`;
  const issuedAt = new Date();

  let createdUserBadge = null;
  try {
    createdUserBadge = await UserBadge.create({
      userId,
      badgeDefinitionId: badgeDef._id,
      badgeId: badgeDef.badgeId,
      achievementId,
      credentialId,
      badgeName: badgeDef.name,
      badgeDescription: badgeDef.description,
      achievementCriteria: badgeDef.achievementCriteria,
      category: badgeDef.category,
      icon: badgeDef.icon || 'award',
      xpThresholdAtIssue: badgeDef.xpThreshold || 0,
      xpAtIssue: currentXp || 0,
      issuedAt,
      status: 'valid',
    });

    await CredentialVerification.create({
      credentialId,
      achievementId,
      userBadgeId: createdUserBadge._id,
      userId,
      recipientDisplayName: fullName || 'QuickFix Student',
      badgeId: badgeDef.badgeId,
      credentialName: badgeDef.name,
      badgeDescription: badgeDef.description,
      achievementCriteria: badgeDef.achievementCriteria,
      category: badgeDef.category,
      issuingPlatform: 'PeerUp',
      issuedAt,
      status: 'valid',
    });

    return createdUserBadge;
  } catch (err) {
    if (createdUserBadge?._id && err?.code !== 11000) {
      await UserBadge.deleteOne({ _id: createdUserBadge._id }).catch(() => {});
    }
    if (err?.code === 11000) return null;
    throw err;
  }
}

export async function evaluateLearningAchievements(userId, streakSummary) {
  await ensureAchievementCatalog();

  const [user, completedActivitiesCount, goals] = await Promise.all([
    User.findById(userId).select('fullName achievementXp').lean(),
    LearningActivity.countDocuments({ userId, completed: true }),
    SkillGoal.find({ userId }).lean(),
  ]);

  if (!user) {
    return { newlyUnlockedBadges: [], totalXpAwarded: 0, stats: {} };
  }

  const completedGoalsCount = goals.filter(
    (g) => (g.currentLevel >= g.targetLevel && g.targetLevel > g.initialLevel) || g.progressPercent >= 100
  ).length;

  const improvedSkillsCount = goals.filter(
    (g) => g.currentLevel > g.initialLevel || g.progressPercent >= 50
  ).length;

  const bestStreak = Math.max(streakSummary?.currentStreak || 0, streakSummary?.longestStreak || 0);

  const checks = [
    {
      met: completedActivitiesCount >= 1,
      badgeId: 'first-learning-activity',
      ruleKey: 'first_learning_activity',
      description: 'Completed first verified learning activity',
    },
    {
      met: bestStreak >= 3,
      badgeId: 'streak-3-days',
      ruleKey: 'learning_streak_3',
      description: 'Reached a 3-day consecutive learning streak',
    },
    {
      met: bestStreak >= 7,
      badgeId: 'streak-7-days',
      ruleKey: 'learning_streak_7',
      description: 'Reached a 7-day consecutive learning streak',
    },
    {
      met: bestStreak >= 30,
      badgeId: 'streak-30-days',
      ruleKey: 'learning_streak_30',
      description: 'Reached a 30-day consecutive learning streak',
    },
    {
      met: completedGoalsCount >= 1,
      badgeId: 'first-skill-goal-completed',
      ruleKey: 'skill_goal_completed',
      description: 'Completed first tracked skill goal',
    },
    {
      met: improvedSkillsCount >= 5,
      badgeId: 'five-skills-improved',
      ruleKey: 'five_skills_improved',
      description: 'Improved proficiency or reached 50%+ progress across 5 skills',
    },
  ];

  const newlyUnlockedBadges = [];
  let totalXpAwarded = 0;
  let latestXp = user.achievementXp || 0;

  for (const item of checks) {
    if (!item.met) continue;

    const xpRes = await awardVerifiedXp({
      userId,
      ruleKey: item.ruleKey,
      referenceKey: `${item.ruleKey}:${String(userId)}`,
      sourceType: 'milestone',
      sourceId: String(userId),
      description: item.description,
    }).catch(() => ({ awarded: false }));

    if (xpRes?.awarded) {
      totalXpAwarded += xpRes.xpAwarded || 0;
      latestXp = xpRes.achievementXp || latestXp + (xpRes.xpAwarded || 0);
    }

    const badge = await awardMilestoneBadgeOnce({
      userId,
      badgeId: item.badgeId,
      fullName: user.fullName,
      currentXp: latestXp,
    }).catch(() => null);

    if (badge) {
      newlyUnlockedBadges.push({
        badgeId: badge.badgeId,
        name: badge.badgeName,
        credentialId: badge.credentialId,
      });
    }
  }

  return {
    newlyUnlockedBadges,
    totalXpAwarded,
    stats: {
      completedActivitiesCount,
      completedGoalsCount,
      improvedSkillsCount,
      bestStreak,
    },
  };
}
