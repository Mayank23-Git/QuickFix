import { Skill } from '../models/Skill.js';
import { SkillGoal } from '../models/SkillGoal.js';
import { LearningActivity } from '../models/LearningActivity.js';
import { SkillProgressSnapshot } from '../models/SkillProgressSnapshot.js';
import { User } from '../models/User.js';
import { UserSkill } from '../models/UserSkill.js';
import { HelpSession } from '../models/HelpSession.js';
import { UserBadge } from '../models/UserBadge.js';
import { asTrimmedString, isValidObjectId, parseBoundedInt } from '../utils/sanitize.js';
import { getDayKey, getUserStreakSummary, normalizeTimezone, shiftDayKey } from '../services/streakService.js';
import {
  buildFallbackRoadmap,
  findPlatformOpportunitiesForStudent,
  generateRoadmapForSkill,
  runSkillGapAnalysis,
} from '../services/skillAnalyzerService.js';
import { evaluateLearningAchievements } from '../services/learningAchievementService.js';

function mapLevelToUserSkillProficiency(level) {
  if (level >= 4) return 'Advanced';
  if (level >= 3) return 'Intermediate';
  return 'Beginner';
}

function mapUserSkillProficiencyToLevel(prof) {
  if (prof === 'Advanced') return 4;
  if (prof === 'Intermediate') return 3;
  return 1;
}

function computeGoalScore(goal) {
  const base = (goal.currentLevel || 1) * 20;
  const bonus = Math.round(((goal.progressPercent || 0) / 100) * 15);
  return Math.min(100, base + (goal.currentLevel < goal.targetLevel ? bonus : 0));
}

function recalculateGoalProgress(goal) {
  const topics = Array.isArray(goal.roadmapTopics) ? goal.roadmapTopics : [];
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;

  let progressPercent = 0;
  if (goal.currentLevel >= goal.targetLevel && goal.targetLevel > goal.initialLevel) {
    progressPercent = 100;
  } else if (totalTopics > 0 && completedTopics === totalTopics) {
    progressPercent = 100;
  } else if (totalTopics > 0) {
    const topicPart = (completedTopics / totalTopics) * 85;
    const studyPart = Math.min(15, Math.floor((goal.totalMinutesLogged || 0) / 15) * 3);
    progressPercent = Math.min(98, Math.round(topicPart + studyPart));
  } else {
    progressPercent = Math.min(100, Math.round(((goal.totalMinutesLogged || 0) / 120) * 100));
  }

  goal.progressPercent = progressPercent;
  if (Array.isArray(goal.milestones)) {
    goal.milestones = goal.milestones.map((m) => ({
      ...m,
      reached: progressPercent >= (m.targetPercent || 50),
    }));
  }
  return goal;
}

async function syncSkillGoalToProfile(userId, goal) {
  if (!goal.syncToProfileSkills) return;
  let skillDoc = null;
  if (goal.skillId) {
    skillDoc = await Skill.findById(goal.skillId).lean();
  }
  if (!skillDoc) {
    skillDoc = await Skill.findOne({
      name: new RegExp(`^${goal.skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    }).lean();
  }
  if (!skillDoc) return;

  if (!goal.skillId) {
    goal.skillId = skillDoc._id;
    await SkillGoal.updateOne({ _id: goal._id }, { $set: { skillId: skillDoc._id } }).catch(() => {});
  }

  await UserSkill.findOneAndUpdate(
    { userId, skillId: skillDoc._id },
    { $set: { proficiency: mapLevelToUserSkillProficiency(goal.currentLevel) } },
    { upsert: true, new: true }
  ).catch(() => {});
}

async function bootstrapGoalsFromUserSkillsIfEmpty(userId, timezone) {
  const existingCount = await SkillGoal.countDocuments({ userId });
  if (existingCount > 0) return;

  const userSkills = await UserSkill.find({ userId })
    .populate('skillId', 'name slug category relatedSlugs')
    .lean();
  if (userSkills.length === 0) return;

  const todayKey = getDayKey(new Date(), timezone);
  for (const us of userSkills.slice(0, 8)) {
    if (!us.skillId) continue;
    const currentLevel = mapUserSkillProficiencyToLevel(us.proficiency);
    const targetLevel = Math.min(5, Math.max(currentLevel + 1, 4));
    const roadmap = buildFallbackRoadmap({
      skillName: us.skillId.name,
      currentLevel,
      targetLevel,
      relatedSlugs: us.skillId.relatedSlugs || [],
    });

    const created = await SkillGoal.create({
      userId,
      skillId: us.skillId._id,
      skillName: us.skillId.name,
      skillNameLower: us.skillId.name.toLowerCase(),
      category: us.skillId.category || 'General',
      initialLevel: currentLevel,
      currentLevel,
      targetLevel,
      priority: targetLevel - currentLevel >= 2 ? 'high' : 'medium',
      goalType: currentLevel <= 2 ? 'learn' : 'improve',
      syncToProfileSkills: true,
      ...roadmap,
      progressPercent: 0,
    }).catch(() => null);

    if (created) {
      await SkillProgressSnapshot.create({
        userId,
        skillGoalId: created._id,
        skillName: created.skillName,
        currentLevel: created.currentLevel,
        targetLevel: created.targetLevel,
        currentScore: computeGoalScore(created),
        targetScore: created.targetLevel * 20,
        minutesAdded: 0,
        dayKey: todayKey,
        eventType: 'initial',
      }).catch(() => {});
    }
  }
}

async function buildChartSeries(userId, goals, timezone, range = 'weekly') {
  const safeRange = range === 'monthly' ? 'monthly' : 'weekly';
  const daysCount = safeRange === 'monthly' ? 30 : 7;
  const todayKey = getDayKey(new Date(), timezone);
  const startDayKey = shiftDayKey(todayKey, -(daysCount - 1));

  const [activities, snapshots] = await Promise.all([
    LearningActivity.find({ userId, completed: true }).sort({ dayKey: 1, createdAt: 1 }).lean(),
    SkillProgressSnapshot.find({ userId }).sort({ dayKey: 1, createdAt: 1 }).lean(),
  ]);

  // 1. Radar & Skill Gap datasets (real SkillGoal values)
  const radarAndGap = goals.map((g) => ({
    goalId: g._id,
    skillName: g.skillName,
    category: g.category,
    currentLevel: g.currentLevel,
    targetLevel: g.targetLevel,
    gap: Math.max(0, g.targetLevel - g.currentLevel),
    progressPercent: g.progressPercent || 0,
    totalMinutesLogged: g.totalMinutesLogged || 0,
    priority: g.priority,
  }));

  // 2. Learning Activity Bar Chart (time spent per skill)
  const minutesBySkill = new Map();
  for (const act of activities) {
    const key = act.skillName || 'General';
    const prev = minutesBySkill.get(key) || { skillName: key, minutes: 0, sessions: 0 };
    minutesBySkill.set(key, {
      skillName: key,
      minutes: prev.minutes + (act.durationMinutes || 0),
      sessions: prev.sessions + 1,
    });
  }
  // Also include tracked goals with 0 logged minutes if <= 6 items so bar chart connects to tracked goals
  for (const g of goals) {
    if (!minutesBySkill.has(g.skillName) && minutesBySkill.size < 8) {
      minutesBySkill.set(g.skillName, { skillName: g.skillName, minutes: 0, sessions: 0 });
    }
  }
  const activityBySkill = Array.from(minutesBySkill.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);

  // 3. Skill Growth Line Chart (Weekly 7d or Monthly 30d from real snapshots + activities)
  const snapshotsByDay = new Map();
  const latestScoreBeforeStart = new Map();

  for (const snap of snapshots) {
    if (snap.dayKey < startDayKey) {
      latestScoreBeforeStart.set(snap.skillName, snap.currentScore);
    } else {
      if (!snapshotsByDay.has(snap.dayKey)) snapshotsByDay.set(snap.dayKey, []);
      snapshotsByDay.get(snap.dayKey).push(snap);
    }
  }

  const minutesByDay = new Map();
  for (const act of activities) {
    if (act.dayKey >= startDayKey && act.dayKey <= todayKey) {
      minutesByDay.set(act.dayKey, (minutesByDay.get(act.dayKey) || 0) + (act.durationMinutes || 0));
    }
  }

  const runningSkillScores = new Map(latestScoreBeforeStart);
  const growthSeries = [];

  for (let i = 0; i < daysCount; i += 1) {
    const dk = shiftDayKey(startDayKey, i);
    const daySnaps = snapshotsByDay.get(dk) || [];
    for (const s of daySnaps) {
      runningSkillScores.set(s.skillName, s.currentScore);
    }

    const scores = Array.from(runningSkillScores.values());
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length) : null;

    const [yy, mm, dd] = dk.split('-').map(Number);
    const label = new Date(Date.UTC(yy, mm - 1, dd)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

    growthSeries.push({
      dayKey: dk,
      label,
      avgSkillScore: avgScore,
      minutesLogged: minutesByDay.get(dk) || 0,
    });
  }

  return {
    range: safeRange,
    radarAndGap,
    activityBySkill,
    growthSeries,
  };
}

export async function getSkillGrowthDashboard(req, res) {
  try {
    const userId = req.user._id;
    const requestedTz = asTrimmedString(req.query?.tz, 80);
    const range = req.query?.range === 'monthly' ? 'monthly' : 'weekly';

    const user = await User.findById(userId)
      .select('fullName college branch academicYear careerGoal learningInterests timezone achievementXp latestAiAnalysis')
      .lean();
    if (!user) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    const timezone = normalizeTimezone(requestedTz || user.timezone || 'UTC');
    if (requestedTz && timezone !== user.timezone) {
      await User.updateOne({ _id: userId }, { $set: { timezone } }).catch(() => {});
    }

    await bootstrapGoalsFromUserSkillsIfEmpty(userId, timezone);

    const [goals, activities, streak, catalogSkills, userSkills, helpedSessions, earnedMilestoneBadges] =
      await Promise.all([
        SkillGoal.find({ userId }).sort({ priority: 1, updatedAt: -1 }).lean(),
        LearningActivity.find({ userId }).sort({ createdAt: -1 }).limit(25).lean(),
        getUserStreakSummary(userId, timezone),
        Skill.find().select('name slug category relatedSlugs').sort({ category: 1, name: 1 }).lean(),
        UserSkill.find({ userId }).populate('skillId', 'name slug category').lean(),
        HelpSession.find({ helperId: userId, status: 'Completed' })
          .populate({
            path: 'requestId',
            select: 'title skillId',
            populate: { path: 'skillId', select: 'name' },
          })
          .sort({ completedAt: -1 })
          .limit(20)
          .lean(),
        UserBadge.find({
          userId,
          badgeId: {
            $in: [
              'first-learning-activity',
              'streak-3-days',
              'streak-7-days',
              'streak-30-days',
              'first-skill-goal-completed',
              'five-skills-improved',
            ],
          },
          status: 'valid',
        })
          .select('badgeId badgeName badgeDescription credentialId issuedAt icon')
          .lean(),
      ]);

    const helpedSkillCounts = new Map();
    for (const s of helpedSessions) {
      const name = s.requestId?.skillId?.name;
      if (name) helpedSkillCounts.set(name, (helpedSkillCounts.get(name) || 0) + 1);
    }
    const helpedSkills = Array.from(helpedSkillCounts.entries()).map(([name, count]) => ({ name, count }));

    const charts = await buildChartSeries(userId, goals, timezone, range);

    let recommendations = user.latestAiAnalysis;
    if (!recommendations) {
      const opportunities = await findPlatformOpportunitiesForStudent({
        userId,
        goals,
        userSkills,
        helpedSkillNames: helpedSkills.map((h) => h.name),
      });
      const topGap = [...goals].sort(
        (a, b) => Math.max(0, b.targetLevel - b.currentLevel) - Math.max(0, a.targetLevel - a.currentLevel)
      )[0];
      recommendations = {
        source: 'fallback',
        generatedAt: new Date().toISOString(),
        summary: topGap
          ? `Your highest priority gap right now is ${topGap.skillName} (Level ${topGap.currentLevel} → ${topGap.targetLevel}).`
          : 'Add your target skills and career goal, then run AI Skill Analysis for personalized study recommendations.',
        prioritySkill: topGap?.skillName || user.learningInterests?.[0] || 'DSA',
        biggestGaps: goals
          .filter((g) => g.targetLevel > g.currentLevel)
          .sort((a, b) => (b.targetLevel - b.currentLevel) - (a.targetLevel - a.currentLevel))
          .slice(0, 3)
          .map((g) => ({
            skillName: g.skillName,
            currentLevel: g.currentLevel,
            targetLevel: g.targetLevel,
            gap: g.targetLevel - g.currentLevel,
            rationale:
              g.recommendedNextSteps?.[0] ||
              `Advance ${g.skillName} from Level ${g.currentLevel} to Level ${g.targetLevel}.`,
          })),
        nextSteps: topGap?.recommendedNextSteps?.length
          ? topGap.recommendedNextSteps
          : ['Click "Run AI Analysis" to generate a personalized study plan tailored to your goals.'],
        helpedSkills,
        peerMentors: opportunities.peerMentors,
        practiceOpportunities: opportunities.practiceOpportunities,
      };
    }

    const totalMinutesStudied = goals.reduce((acc, g) => acc + (g.totalMinutesLogged || 0), 0);

    return res.json({
      profile: {
        careerGoal: user.careerGoal || '',
        learningInterests: user.learningInterests || [],
        timezone,
        achievementXp: user.achievementXp || 0,
        helpedSkills,
      },
      summary: {
        trackedSkillsCount: goals.length,
        skillsWithGapCount: goals.filter((g) => g.targetLevel > g.currentLevel).length,
        completedGoalsCount: goals.filter(
          (g) => (g.currentLevel >= g.targetLevel && g.targetLevel > g.initialLevel) || g.progressPercent >= 100
        ).length,
        improvedSkillsCount: goals.filter((g) => g.currentLevel > g.initialLevel || g.progressPercent >= 50).length,
        totalMinutesStudied: Math.max(totalMinutesStudied, streak.totalMinutes || 0),
      },
      goals,
      activities,
      streak,
      charts,
      recommendations,
      earnedMilestoneBadges,
      catalogSkills,
    });
  } catch (error) {
    console.error('[Skill Growth Dashboard Error]', error);
    return res.status(500).json({ error: 'Failed to load skill growth analytics.' });
  }
}

export async function getSkillGrowthCharts(req, res) {
  try {
    const userId = req.user._id;
    const range = req.query?.range === 'monthly' ? 'monthly' : 'weekly';
    const user = await User.findById(userId).select('timezone').lean();
    const timezone = normalizeTimezone(req.query?.tz || user?.timezone || 'UTC');
    const goals = await SkillGoal.find({ userId }).sort({ priority: 1, updatedAt: -1 }).lean();
    const charts = await buildChartSeries(userId, goals, timezone, range);
    return res.json({ charts });
  } catch (error) {
    console.error('[Skill Growth Charts Error]', error);
    return res.status(500).json({ error: 'Failed to load skill growth charts.' });
  }
}

export async function getStreakDetails(req, res) {
  try {
    const streak = await getUserStreakSummary(req.user._id, asTrimmedString(req.query?.tz, 80));
    return res.json({ streak });
  } catch (error) {
    console.error('[Streak Details Error]', error);
    return res.status(500).json({ error: 'Failed to load learning streak.' });
  }
}

export async function updateProfileLearningGoals(req, res) {
  try {
    const careerGoal = asTrimmedString(req.body?.careerGoal, 160);
    const timezone = normalizeTimezone(asTrimmedString(req.body?.timezone, 80) || req.user.timezone);
    const rawInterests = Array.isArray(req.body?.learningInterests)
      ? req.body.learningInterests
      : typeof req.body?.learningInterests === 'string'
      ? req.body.learningInterests.split(',')
      : [];

    const learningInterests = [
      ...new Set(
        rawInterests
          .map((item) => asTrimmedString(item, 50))
          .filter(Boolean)
          .slice(0, 12)
      ),
    ];

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { careerGoal, learningInterests, timezone } },
      { new: true, runValidators: true }
    )
      .select('careerGoal learningInterests timezone')
      .lean();

    return res.json({
      message: 'Learning goals and interests updated.',
      profile: updated,
    });
  } catch (error) {
    console.error('[Update Learning Goals Error]', error);
    return res.status(500).json({ error: 'Failed to update learning goals.' });
  }
}

export async function createSkillGoal(req, res) {
  try {
    const userId = req.user._id;
    const rawSkillId = asTrimmedString(req.body?.skillId, 40);
    let skillName = asTrimmedString(req.body?.skillName, 80);
    let category = asTrimmedString(req.body?.category, 50) || 'General';
    const currentLevel = parseBoundedInt(req.body?.currentLevel, 1, 5, 2);
    const targetLevel = Math.max(currentLevel, parseBoundedInt(req.body?.targetLevel, 1, 5, 4));
    const priority = ['high', 'medium', 'low'].includes(req.body?.priority) ? req.body.priority : 'medium';
    const goalType = ['learn', 'improve', 'master'].includes(req.body?.goalType)
      ? req.body.goalType
      : currentLevel <= 2
      ? 'learn'
      : 'improve';
    const syncToProfileSkills = req.body?.syncToProfileSkills !== false;

    let catalogSkill = null;
    if (rawSkillId && isValidObjectId(rawSkillId)) {
      catalogSkill = await Skill.findById(rawSkillId).lean();
    } else if (skillName) {
      catalogSkill = await Skill.findOne({
        name: new RegExp(`^${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      }).lean();
    }

    if (catalogSkill) {
      skillName = catalogSkill.name;
      category = catalogSkill.category || category;
    }

    if (!skillName || skillName.length < 2) {
      return res.status(400).json({ error: 'Please select a skill or enter a skill name (at least 2 characters).' });
    }

    const existing = await SkillGoal.findOne({
      userId,
      skillNameLower: skillName.toLowerCase(),
    }).lean();
    if (existing) {
      return res.status(409).json({ error: `${skillName} is already in your Skill Gap Analyzer.` });
    }

    const user = await User.findById(userId).select('careerGoal timezone').lean();
    const roadmap = await generateRoadmapForSkill({
      skillName,
      currentLevel,
      targetLevel,
      careerGoal: user?.careerGoal || '',
      relatedSlugs: catalogSkill?.relatedSlugs || [],
    });

    const goal = await SkillGoal.create({
      userId,
      skillId: catalogSkill?._id || null,
      skillName,
      skillNameLower: skillName.toLowerCase(),
      category,
      initialLevel: currentLevel,
      currentLevel,
      targetLevel,
      priority,
      goalType,
      syncToProfileSkills,
      roadmapTopics: roadmap.roadmapTopics,
      recommendedNextSteps: roadmap.recommendedNextSteps,
      relatedTopics: roadmap.relatedTopics,
      recommendedActivities: roadmap.recommendedActivities,
      milestones: roadmap.milestones,
      progressPercent: 0,
    });

    await syncSkillGoalToProfile(userId, goal);

    const timezone = normalizeTimezone(user?.timezone || 'UTC');
    await SkillProgressSnapshot.create({
      userId,
      skillGoalId: goal._id,
      skillName: goal.skillName,
      currentLevel: goal.currentLevel,
      targetLevel: goal.targetLevel,
      currentScore: computeGoalScore(goal),
      targetScore: goal.targetLevel * 20,
      minutesAdded: 0,
      dayKey: getDayKey(new Date(), timezone),
      eventType: 'initial',
    }).catch(() => {});

    const streak = await getUserStreakSummary(userId, timezone);
    const achievementUpdate = await evaluateLearningAchievements(userId, streak);

    return res.status(201).json({
      message: `${skillName} added with a personalized ${goal.roadmapTopics.length}-step roadmap.`,
      goal,
      achievementUpdate,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'This skill is already tracked in your analyzer.' });
    }
    console.error('[Create Skill Goal Error]', error);
    return res.status(500).json({ error: 'Failed to add skill goal.' });
  }
}

export async function updateSkillGoal(req, res) {
  try {
    const userId = req.user._id;
    const { goalId } = req.params;
    if (!isValidObjectId(goalId)) {
      return res.status(400).json({ error: 'Invalid skill goal ID.' });
    }

    const goal = await SkillGoal.findOne({ _id: goalId, userId });
    if (!goal) {
      return res.status(404).json({ error: 'Skill goal not found.' });
    }

    if (req.body?.currentLevel !== undefined) {
      goal.currentLevel = parseBoundedInt(req.body.currentLevel, 1, 5, goal.currentLevel);
    }
    if (req.body?.targetLevel !== undefined) {
      goal.targetLevel = parseBoundedInt(req.body.targetLevel, 1, 5, goal.targetLevel);
    }
    if (goal.targetLevel < goal.currentLevel) {
      goal.targetLevel = goal.currentLevel;
    }
    if (['high', 'medium', 'low'].includes(req.body?.priority)) {
      goal.priority = req.body.priority;
    }
    if (['learn', 'improve', 'master'].includes(req.body?.goalType)) {
      goal.goalType = req.body.goalType;
    }
    if (req.body?.category) {
      goal.category = asTrimmedString(req.body.category, 50) || goal.category;
    }
    if (typeof req.body?.syncToProfileSkills === 'boolean') {
      goal.syncToProfileSkills = req.body.syncToProfileSkills;
    }

    recalculateGoalProgress(goal);
    await goal.save();
    await syncSkillGoalToProfile(userId, goal);

    const user = await User.findById(userId).select('timezone').lean();
    const timezone = normalizeTimezone(user?.timezone || 'UTC');
    await SkillProgressSnapshot.create({
      userId,
      skillGoalId: goal._id,
      skillName: goal.skillName,
      currentLevel: goal.currentLevel,
      targetLevel: goal.targetLevel,
      currentScore: computeGoalScore(goal),
      targetScore: goal.targetLevel * 20,
      minutesAdded: 0,
      dayKey: getDayKey(new Date(), timezone),
      eventType: 'level_update',
    }).catch(() => {});

    const streak = await getUserStreakSummary(userId, timezone);
    const achievementUpdate = await evaluateLearningAchievements(userId, streak);

    return res.json({
      message: `${goal.skillName} updated.`,
      goal,
      achievementUpdate,
    });
  } catch (error) {
    console.error('[Update Skill Goal Error]', error);
    return res.status(500).json({ error: 'Failed to update skill goal.' });
  }
}

export async function deleteSkillGoal(req, res) {
  try {
    const userId = req.user._id;
    const { goalId } = req.params;
    if (!isValidObjectId(goalId)) {
      return res.status(400).json({ error: 'Invalid skill goal ID.' });
    }

    const deleted = await SkillGoal.findOneAndDelete({ _id: goalId, userId }).lean();
    if (!deleted) {
      return res.status(404).json({ error: 'Skill goal not found.' });
    }

    return res.json({
      message: `${deleted.skillName} removed from your Skill Gap Analyzer.`,
      deletedId: goalId,
    });
  } catch (error) {
    console.error('[Delete Skill Goal Error]', error);
    return res.status(500).json({ error: 'Failed to remove skill goal.' });
  }
}

export async function toggleRoadmapTopic(req, res) {
  try {
    const userId = req.user._id;
    const { goalId, topicId } = req.params;
    if (!isValidObjectId(goalId)) {
      return res.status(400).json({ error: 'Invalid skill goal ID.' });
    }

    const goal = await SkillGoal.findOne({ _id: goalId, userId });
    if (!goal) {
      return res.status(404).json({ error: 'Skill goal not found.' });
    }

    const topic = (goal.roadmapTopics || []).find((t) => t.topicId === topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Roadmap topic not found.' });
    }

    const nextCompleted =
      typeof req.body?.completed === 'boolean' ? req.body.completed : !topic.completed;
    topic.completed = nextCompleted;
    topic.completedAt = nextCompleted ? new Date() : null;

    if (nextCompleted && req.body?.logActivity !== false) {
      goal.totalMinutesLogged = (goal.totalMinutesLogged || 0) + (topic.estimatedMinutes || 30);
    }

    recalculateGoalProgress(goal);
    await goal.save();

    const user = await User.findById(userId).select('timezone').lean();
    const timezone = normalizeTimezone(asTrimmedString(req.body?.timezone, 80) || user?.timezone || 'UTC');
    const dayKey = getDayKey(new Date(), timezone);

    if (nextCompleted) {
      // Idempotently record a meaningful learning activity for completing this roadmap topic
      await LearningActivity.create({
        userId,
        skillGoalId: goal._id,
        skillId: goal.skillId || null,
        skillName: goal.skillName,
        topic: topic.title,
        durationMinutes: topic.estimatedMinutes || 30,
        completed: true,
        note: `Completed roadmap milestone in ${goal.skillName}`,
        activityType: 'roadmap_topic',
        dayKey,
        timezone,
        sourceRef: `topic:${String(goal._id)}:${topic.topicId}`,
      }).catch(() => {});

      await SkillProgressSnapshot.create({
        userId,
        skillGoalId: goal._id,
        skillName: goal.skillName,
        currentLevel: goal.currentLevel,
        targetLevel: goal.targetLevel,
        currentScore: computeGoalScore(goal),
        targetScore: goal.targetLevel * 20,
        minutesAdded: topic.estimatedMinutes || 30,
        dayKey,
        eventType: 'topic_completed',
      }).catch(() => {});
    }

    const streak = await getUserStreakSummary(userId, timezone);
    const achievementUpdate = await evaluateLearningAchievements(userId, streak);

    return res.json({
      message: nextCompleted ? `Marked "${topic.title}" complete.` : `Reopened "${topic.title}".`,
      goal,
      streak,
      achievementUpdate,
    });
  } catch (error) {
    console.error('[Toggle Roadmap Topic Error]', error);
    return res.status(500).json({ error: 'Failed to update roadmap topic.' });
  }
}

export async function logLearningActivity(req, res) {
  try {
    const userId = req.user._id;
    const rawGoalId = asTrimmedString(req.body?.skillGoalId, 40);
    let skillName = asTrimmedString(req.body?.skillName, 80);
    const topic = asTrimmedString(req.body?.topic, 160);
    const durationMinutes = parseBoundedInt(req.body?.durationMinutes, 1, 600, 30);
    const completed = req.body?.completed !== false;
    const note = asTrimmedString(req.body?.note, 500);
    const idempotencyKey = asTrimmedString(req.body?.idempotencyKey, 80) || undefined;

    if (topic.length < 2) {
      return res.status(400).json({ error: 'Please enter the topic studied (at least 2 characters).' });
    }

    let goal = null;
    if (rawGoalId && isValidObjectId(rawGoalId)) {
      goal = await SkillGoal.findOne({ _id: rawGoalId, userId });
      if (goal) {
        skillName = goal.skillName;
      }
    }

    if (!goal && skillName) {
      goal = await SkillGoal.findOne({ userId, skillNameLower: skillName.toLowerCase() });
    }

    if (!skillName) {
      return res.status(400).json({ error: 'Please select or enter a skill for this learning activity.' });
    }

    const user = await User.findById(userId).select('timezone').lean();
    const timezone = normalizeTimezone(asTrimmedString(req.body?.timezone, 80) || user?.timezone || 'UTC');
    const dayKey = getDayKey(new Date(), timezone);

    if (idempotencyKey) {
      const existingDup = await LearningActivity.findOne({ userId, idempotencyKey }).lean();
      if (existingDup) {
        const streak = await getUserStreakSummary(userId, timezone);
        return res.status(200).json({
          duplicate: true,
          message: 'Activity already logged.',
          activity: existingDup,
          streak,
        });
      }
    }

    const activity = await LearningActivity.create({
      userId,
      skillGoalId: goal?._id || null,
      skillId: goal?.skillId || null,
      skillName,
      topic,
      durationMinutes,
      completed,
      note,
      activityType: 'study_session',
      dayKey,
      timezone,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });

    if (goal && completed) {
      goal.totalMinutesLogged = (goal.totalMinutesLogged || 0) + durationMinutes;
      recalculateGoalProgress(goal);
      await goal.save();

      await SkillProgressSnapshot.create({
        userId,
        skillGoalId: goal._id,
        skillName: goal.skillName,
        currentLevel: goal.currentLevel,
        targetLevel: goal.targetLevel,
        currentScore: computeGoalScore(goal),
        targetScore: goal.targetLevel * 20,
        minutesAdded: durationMinutes,
        dayKey,
        eventType: 'activity_logged',
      }).catch(() => {});
    }

    const streak = await getUserStreakSummary(userId, timezone);
    const achievementUpdate = await evaluateLearningAchievements(userId, streak);

    return res.status(201).json({
      message: completed
        ? `Logged ${durationMinutes} min on ${skillName}. Streak: ${streak.currentStreak} day(s).`
        : `Saved draft study note for ${skillName}.`,
      activity,
      goal: goal || null,
      streak,
      achievementUpdate,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'This learning activity was already submitted.' });
    }
    console.error('[Log Learning Activity Error]', error);
    return res.status(500).json({ error: 'Failed to log learning activity.' });
  }
}

export async function generateAiRecommendations(req, res) {
  try {
    const recommendations = await runSkillGapAnalysis(req.user._id);
    const goals = await SkillGoal.find({ userId: req.user._id }).sort({ priority: 1, updatedAt: -1 }).lean();
    return res.json({
      message:
        recommendations.source === 'ai'
          ? 'AI skill gap analysis updated.'
          : 'Skill gap recommendations refreshed using profile analysis.',
      recommendations,
      goals,
    });
  } catch (error) {
    console.error('[Generate Recommendations Error]', error);
    return res.status(500).json({ error: 'Failed to generate learning recommendations.' });
  }
}
