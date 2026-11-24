import { AchievementRule } from '../models/AchievementRule.js';
import { BadgeDefinition } from '../models/BadgeDefinition.js';
import { User } from '../models/User.js';
import { UserXPTransaction } from '../models/UserXPTransaction.js';
import { HelpSession } from '../models/HelpSession.js';

export const DEFAULT_ACHIEVEMENT_RULES = [
  {
    ruleKey: 'session_completed',
    name: 'Verified Mentoring Session',
    description: 'Successfully complete a verified 15-minute live peer mentoring session.',
    xpAmount: 20,
    category: 'Mentoring',
    active: true,
  },
  {
    ruleKey: 'positive_feedback',
    name: 'Positive Session Feedback',
    description: 'Receive verified positive post-session feedback (4+ stars) from the requester.',
    xpAmount: 5,
    category: 'Mentoring',
    active: true,
  },
  {
    ruleKey: 'five_unique_students',
    name: 'Help Five Different Students',
    description: 'Complete verified mentoring sessions for 5 distinct students on campus.',
    xpAmount: 30,
    category: 'Community',
    active: true,
  },
  {
    ruleKey: 'approved_resource',
    name: 'Approved Learning Resource',
    description: 'Contribute a high-quality study guide or debugging reference approved by an admin.',
    xpAmount: 25,
    category: 'Learning',
    active: true,
  },
  {
    ruleKey: 'approved_workshop',
    name: 'Approved Workshop Hosting',
    description: 'Host a verified campus peer workshop or problem-solving session approved by an admin.',
    xpAmount: 50,
    category: 'Community',
    active: true,
  },
  {
    ruleKey: 'first_learning_activity',
    name: 'First Learning Activity',
    description: 'Log your first verified study session or complete your first skill roadmap topic.',
    xpAmount: 10,
    category: 'Learning',
    active: true,
  },
  {
    ruleKey: 'learning_streak_3',
    name: '3-Day Learning Streak',
    description: 'Maintain meaningful learning activity for 3 consecutive calendar days.',
    xpAmount: 15,
    category: 'Learning',
    active: true,
  },
  {
    ruleKey: 'learning_streak_7',
    name: '7-Day Learning Streak',
    description: 'Maintain meaningful learning activity for 7 consecutive calendar days.',
    xpAmount: 30,
    category: 'Learning',
    active: true,
  },
  {
    ruleKey: 'learning_streak_30',
    name: '30-Day Learning Streak',
    description: 'Maintain meaningful learning activity for 30 consecutive calendar days.',
    xpAmount: 75,
    category: 'Learning',
    active: true,
  },
  {
    ruleKey: 'skill_goal_completed',
    name: 'First Skill Goal Completed',
    description: 'Reach your target proficiency or 100% roadmap mastery on a tracked skill goal.',
    xpAmount: 25,
    category: 'Learning',
    active: true,
  },
  {
    ruleKey: 'five_skills_improved',
    name: '5 Skills Improved',
    description: 'Demonstrate measurable growth across 5 distinct tracked skills.',
    xpAmount: 40,
    category: 'Learning',
    active: true,
  },
];

export const DEFAULT_BADGES = [
  {
    badgeId: 'knowledge-sharer',
    name: 'Knowledge Sharer',
    description: 'Earned for consistently helping peers unblock coding and academic concepts.',
    icon: 'book-open',
    xpThreshold: 100,
    unlockType: 'xp',
    milestoneKey: '',
    achievementCriteria: 'Reach 100 verified Achievement XP through mentoring, resources, or feedback.',
    category: 'Learning',
    active: true,
    sortOrder: 1,
  },
  {
    badgeId: 'peer-mentor',
    name: 'Peer Mentor',
    description: 'Recognizes dependable 1-on-1 campus mentors guiding classmates through live sessions.',
    icon: 'users',
    xpThreshold: 250,
    unlockType: 'xp',
    milestoneKey: '',
    achievementCriteria: 'Reach 250 verified Achievement XP from completed mentoring sessions and impact.',
    category: 'Mentoring',
    active: true,
    sortOrder: 2,
  },
  {
    badgeId: 'problem-solver',
    name: 'Problem Solver',
    description: 'Awarded to students who resolve complex debugging doubts and technical blockers.',
    icon: 'lightbulb',
    xpThreshold: 500,
    unlockType: 'xp',
    milestoneKey: '',
    achievementCriteria: 'Reach 500 verified Achievement XP across verified peer problem-solving sessions.',
    category: 'Mentoring',
    active: true,
    sortOrder: 3,
  },
  {
    badgeId: 'community-champion',
    name: 'Community Champion',
    description: 'Honors active campus leaders supporting diverse students, resources, and workshops.',
    icon: 'trophy',
    xpThreshold: 1000,
    unlockType: 'xp',
    milestoneKey: '',
    achievementCriteria: 'Reach 1000 verified Achievement XP supporting multiple peers and community events.',
    category: 'Community',
    active: true,
    sortOrder: 4,
  },
  {
    badgeId: 'dsa-specialist',
    name: 'DSA Specialist',
    description: 'Recognizes deep algorithmic and data structures mentorship across campus peers.',
    icon: 'cpu',
    xpThreshold: 1500,
    unlockType: 'xp',
    milestoneKey: '',
    achievementCriteria: 'Reach 1500 verified Achievement XP mentoring students in technical and DSA tracks.',
    category: 'DSA',
    active: true,
    sortOrder: 5,
  },
  {
    badgeId: 'top-contributor',
    name: 'Top Contributor',
    description: 'Highest peer-learning honor on PeerUp / QuickFix for sustained campus mentorship.',
    icon: 'award',
    xpThreshold: 2500,
    unlockType: 'xp',
    milestoneKey: '',
    achievementCriteria: 'Reach 2500 verified Achievement XP as a top-tier verified campus mentor.',
    category: 'Community',
    active: true,
    sortOrder: 6,
  },
  {
    badgeId: 'first-learning-activity',
    name: 'First Learning Activity',
    description: 'Unlocked upon logging your first verified learning session or roadmap step.',
    icon: 'sparkles',
    xpThreshold: 0,
    unlockType: 'milestone',
    milestoneKey: 'first_learning_activity',
    achievementCriteria: 'Complete at least 1 meaningful learning activity or roadmap topic.',
    category: 'Learning',
    active: true,
    sortOrder: 7,
  },
  {
    badgeId: 'streak-3-days',
    name: '3-Day Learning Streak',
    description: 'Builds study momentum with three consecutive days of verified learning.',
    icon: 'flame',
    xpThreshold: 0,
    unlockType: 'milestone',
    milestoneKey: 'streak_3_days',
    achievementCriteria: 'Maintain a 3-day consecutive learning streak without missing a day.',
    category: 'Learning',
    active: true,
    sortOrder: 8,
  },
  {
    badgeId: 'streak-7-days',
    name: '7-Day Learning Streak',
    description: 'Demonstrates a full week of disciplined daily technical skill growth.',
    icon: 'flame',
    xpThreshold: 0,
    unlockType: 'milestone',
    milestoneKey: 'streak_7_days',
    achievementCriteria: 'Maintain a 7-day consecutive learning streak across active days.',
    category: 'Learning',
    active: true,
    sortOrder: 9,
  },
  {
    badgeId: 'streak-30-days',
    name: '30-Day Learning Streak',
    description: 'Elite consistency across an entire month of deliberate daily skill practice.',
    icon: 'flame',
    xpThreshold: 0,
    unlockType: 'milestone',
    milestoneKey: 'streak_30_days',
    achievementCriteria: 'Maintain a 30-day consecutive learning streak across active days.',
    category: 'Learning',
    active: true,
    sortOrder: 10,
  },
  {
    badgeId: 'first-skill-goal-completed',
    name: 'First Skill Goal Completed',
    description: 'Awarded when you close a skill gap by reaching your target proficiency level.',
    icon: 'target',
    xpThreshold: 0,
    unlockType: 'milestone',
    milestoneKey: 'first_skill_goal_completed',
    achievementCriteria: 'Complete 1 tracked skill goal by reaching target level or 100% roadmap completion.',
    category: 'Learning',
    active: true,
    sortOrder: 11,
  },
  {
    badgeId: 'five-skills-improved',
    name: '5 Skills Improved',
    description: 'Recognizes broad technical versatility after advancing five distinct skills.',
    icon: 'trending-up',
    xpThreshold: 0,
    unlockType: 'milestone',
    milestoneKey: 'five_skills_improved',
    achievementCriteria: 'Improve proficiency or reach 50%+ verified progress in 5 distinct skills.',
    category: 'Learning',
    active: true,
    sortOrder: 12,
  },
];

let catalogReadyPromise = null;

export async function ensureAchievementCatalog({ force = false } = {}) {
  if (catalogReadyPromise && !force) {
    return catalogReadyPromise;
  }

  catalogReadyPromise = (async () => {
    for (const rule of DEFAULT_ACHIEVEMENT_RULES) {
      await AchievementRule.updateOne(
        { ruleKey: rule.ruleKey },
        { $setOnInsert: rule },
        { upsert: true }
      );
    }

    for (const badge of DEFAULT_BADGES) {
      await BadgeDefinition.updateOne(
        { badgeId: badge.badgeId },
        { $setOnInsert: badge },
        { upsert: true }
      );
    }
  })().catch((err) => {
    catalogReadyPromise = null;
    throw err;
  });

  return catalogReadyPromise;
}

/**
 * Atomically awards verified XP once per unique referenceKey.
 * Prevents duplicate rewards and self-awarding fraud.
 */
export async function awardVerifiedXp({
  userId,
  ruleKey,
  referenceKey,
  sourceType,
  sourceId = '',
  actorId = null,
  description = '',
}) {
  await ensureAchievementCatalog();

  if (!userId || !ruleKey || !referenceKey) {
    return { awarded: false, reason: 'missing_parameters' };
  }

  if (actorId && String(actorId) === String(userId) && sourceType !== 'milestone') {
    return { awarded: false, reason: 'self_award_blocked' };
  }

  const rule = await AchievementRule.findOne({ ruleKey, active: true }).lean();
  if (!rule || rule.xpAmount <= 0) {
    return { awarded: false, reason: 'rule_inactive_or_missing' };
  }

  // Fast pre-check before unique insert lock
  const existingTx = await UserXPTransaction.findOne({ referenceKey }).lean();
  if (existingTx) {
    return { awarded: false, duplicate: true, transaction: existingTx };
  }

  // Atomic lock via unique referenceKey index
  let txDoc = null;
  try {
    const currentUser = await User.findById(userId).select('achievementXp').lean();
    if (!currentUser) {
      return { awarded: false, reason: 'user_not_found' };
    }

    txDoc = await UserXPTransaction.create({
      userId,
      ruleKey: rule.ruleKey,
      xpDelta: rule.xpAmount,
      balanceAfter: (currentUser.achievementXp || 0) + rule.xpAmount,
      referenceKey,
      sourceType,
      sourceId: String(sourceId || ''),
      actorId: actorId || null,
      description: description || rule.name,
      status: 'verified',
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { achievementXp: rule.xpAmount } },
      { new: true }
    ).select('achievementXp');

    if (!updatedUser) {
      await UserXPTransaction.deleteOne({ _id: txDoc._id }).catch(() => {});
      return { awarded: false, reason: 'user_update_failed' };
    }

    if (txDoc.balanceAfter !== updatedUser.achievementXp) {
      await UserXPTransaction.updateOne(
        { _id: txDoc._id },
        { $set: { balanceAfter: updatedUser.achievementXp } }
      ).catch(() => {});
      txDoc.balanceAfter = updatedUser.achievementXp;
    }

    return {
      awarded: true,
      xpAwarded: rule.xpAmount,
      achievementXp: updatedUser.achievementXp,
      transaction: txDoc,
    };
  } catch (err) {
    if (err?.code === 11000) {
      return { awarded: false, duplicate: true };
    }
    if (txDoc?._id) {
      await UserXPTransaction.deleteOne({ _id: txDoc._id }).catch(() => {});
    }
    throw err;
  }
}

export async function getDistinctHelpedStudentCount(helperId) {
  const distinctRequesters = await HelpSession.distinct('requesterId', {
    helperId,
    status: 'Completed',
    rewarded: true,
  });
  return distinctRequesters.filter((rid) => String(rid) !== String(helperId)).length;
}

export async function checkAndAwardFiveStudentsBonus(helperId) {
  const distinctCount = await getDistinctHelpedStudentCount(helperId);
  if (distinctCount < 5) {
    return { awarded: false, distinctCount };
  }

  // Award +30 bonus XP when helping 5 distinct students (unique milestone referenceKey)
  const result = await awardVerifiedXp({
    userId: helperId,
    ruleKey: 'five_unique_students',
    referenceKey: `five_students:${String(helperId)}:milestone_5`,
    sourceType: 'milestone',
    sourceId: String(helperId),
    description: 'Bonus XP for mentoring 5 different students on campus',
  });

  return {
    ...result,
    distinctCount,
  };
}
