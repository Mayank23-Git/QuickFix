import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import { Skill } from '../models/Skill.js';
import { User } from '../models/User.js';
import { UserSkill } from '../models/UserSkill.js';
import { HelpRequest } from '../models/HelpRequest.js';
import { HelpSession } from '../models/HelpSession.js';
import { LearningActivity } from '../models/LearningActivity.js';
import { SkillGoal } from '../models/SkillGoal.js';

const LEVEL_NAMES = {
  1: 'Beginner',
  2: 'Foundations',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const SKILL_TOPIC_TEMPLATES = {
  dsa: [
    { title: 'Time & Space Complexity Analysis', description: 'Master Big-O, recurrence trees, and amortized bounds.', estimatedMinutes: 35 },
    { title: 'Two Pointers & Sliding Window Patterns', description: 'Solve fixed and variable window substring/subarray problems.', estimatedMinutes: 45 },
    { title: 'Binary Search on Answer Space', description: 'Apply monotonic predicates to optimization problems.', estimatedMinutes: 45 },
    { title: 'Trees, Graphs, BFS & DFS Traversals', description: 'Implement cycle detection, shortest paths, and topological sort.', estimatedMinutes: 60 },
    { title: 'Dynamic Programming State Transitions', description: 'Convert memoized recursion into bottom-up DP tables.', estimatedMinutes: 60 },
  ],
  react: [
    { title: 'Component Composition & Derived State', description: 'Avoid redundant state and keep props clean and predictable.', estimatedMinutes: 30 },
    { title: 'Hooks Lifecycle & Effect Dependencies', description: 'Prevent stale closures and infinite re-render loops in useEffect.', estimatedMinutes: 40 },
    { title: 'Async Data Fetching & Error Boundaries', description: 'Handle loading, cancellation, and optimistic UI safely.', estimatedMinutes: 45 },
    { title: 'Custom Hooks & Performance Memoization', description: 'Use useMemo, useCallback, and state colocation effectively.', estimatedMinutes: 40 },
  ],
  cpp: [
    { title: 'Pointers, References & Memory Layout', description: 'Debug dereferencing, stack vs heap lifetime, and RAII.', estimatedMinutes: 40 },
    { title: 'STL Containers & Iterator Invalidation', description: 'Choose vector, map, unordered_map, and set with confidence.', estimatedMinutes: 45 },
    { title: 'Templates, Lambdas & Move Semantics', description: 'Write generic algorithms and avoid unnecessary deep copies.', estimatedMinutes: 50 },
    { title: 'Debugging Segfaults & Valgrind/Sanitizers', description: 'Isolate out-of-bounds access and dangling pointers fast.', estimatedMinutes: 35 },
  ],
  python: [
    { title: 'Pythonic Data Structures & Comprehensions', description: 'Use dicts, sets, generators, and collections efficiently.', estimatedMinutes: 35 },
    { title: 'Virtual Environments, Packaging & Testing', description: 'Structure modules cleanly with pytest and type hints.', estimatedMinutes: 40 },
    { title: 'Data Manipulation & Numerical Workflows', description: 'Vectorize computations cleanly without slow loops.', estimatedMinutes: 45 },
    { title: 'API Integration & Async Tasks', description: 'Build reliable scripts and web backends with clean error handling.', estimatedMinutes: 45 },
  ],
  sql: [
    { title: 'Relational Joins & Multi-Table Queries', description: 'Master INNER, LEFT, and self-joins without duplicate row inflation.', estimatedMinutes: 35 },
    { title: 'Aggregations, GROUP BY & HAVING', description: 'Write accurate reporting queries and conditional sums.', estimatedMinutes: 35 },
    { title: 'CTEs, Window Functions & Subqueries', description: 'Rank partitions, compute running totals, and simplify complex queries.', estimatedMinutes: 50 },
    { title: 'Indexes, Query Plans & Normalization', description: 'Eliminate full table scans and design 3NF/BCNF schemas.', estimatedMinutes: 45 },
  ],
  javascript: [
    { title: 'Execution Context, Scope & Closures', description: 'Understand lexical scoping, hoisting, and private state.', estimatedMinutes: 35 },
    { title: 'Promises, Async/Await & Event Loop', description: 'Debug microtasks, race conditions, and parallel requests.', estimatedMinutes: 45 },
    { title: 'Array Methods & Immutable Transformations', description: 'Compose map, filter, reduce, and modern ES syntax cleanly.', estimatedMinutes: 30 },
    { title: 'DOM Events, Fetch & Error Handling', description: 'Handle network retries, delegation, and clean validation.', estimatedMinutes: 40 },
  ],
};

function hasUsableGeminiKey() {
  const key = env.geminiApiKey;
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

function getGeminiClient() {
  if (!hasUsableGeminiKey()) return null;
  return new GoogleGenAI({
    apiKey: env.geminiApiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

export function buildFallbackRoadmap({ skillName, currentLevel = 1, targetLevel = 4, relatedSlugs = [] }) {
  const normalized = skillName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let templateKey = Object.keys(SKILL_TOPIC_TEMPLATES).find((k) => normalized.includes(k));
  if (!templateKey && normalized.includes('datastructure')) templateKey = 'dsa';

  const baseTopics = templateKey
    ? SKILL_TOPIC_TEMPLATES[templateKey]
    : [
        {
          title: `${skillName} Core Mental Models`,
          description: `Solidify foundational syntax, terminology, and core mechanics of ${skillName}.`,
          estimatedMinutes: 35,
        },
        {
          title: `Guided ${skillName} Hands-On Exercises`,
          description: `Work through 3-5 focused practice problems to bridge theory into muscle memory.`,
          estimatedMinutes: 45,
        },
        {
          title: `Debugging Common ${skillName} Pitfalls`,
          description: `Identify edge cases, error patterns, and troubleshooting workflows.`,
          estimatedMinutes: 40,
        },
        {
          title: `Applied Mini-Project or Peer Walkthrough`,
          description: `Build or explain a real ${skillName} example to verify Level ${targetLevel} readiness.`,
          estimatedMinutes: 55,
        },
      ];

  const roadmapTopics = baseTopics.map((item, idx) => ({
    topicId: `topic-${idx + 1}`,
    title: item.title,
    description: item.description,
    estimatedMinutes: item.estimatedMinutes,
    completed: false,
    completedAt: null,
  }));

  const gap = Math.max(0, targetLevel - currentLevel);
  const recommendedNextSteps = [
    `Complete "${roadmapTopics[0].title}" in a focused 35-minute block.`,
    gap >= 2
      ? `Book or join a 15-minute QuickFix peer session on ${skillName} to accelerate past common blockers.`
      : `Solve an open campus doubt tagged with ${skillName} to reinforce mastery by teaching.`,
    `Log at least 2 active study sessions this week to advance from ${LEVEL_NAMES[currentLevel]} toward ${LEVEL_NAMES[targetLevel]}.`,
  ];

  const relatedTopics = relatedSlugs.length
    ? relatedSlugs.map((s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    : [`${skillName} Problem Solving`, `${skillName} Best Practices`, 'System Debugging'];

  const recommendedActivities = [
    `30m deliberate practice on ${roadmapTopics[0].title}`,
    `Review 2 real doubts in ${skillName} on the QuickFix Doubt Board`,
    `Write summary notes covering key ${skillName} edge cases`,
  ];

  const milestones = [
    { title: `Foundation Check (${skillName} Basics)`, targetPercent: 25, reached: false },
    { title: `Midpoint Practice Benchmark`, targetPercent: 50, reached: false },
    { title: `Target Level ${targetLevel} Readiness`, targetPercent: 100, reached: false },
  ];

  return {
    roadmapTopics,
    recommendedNextSteps,
    relatedTopics,
    recommendedActivities,
    milestones,
  };
}

export async function generateRoadmapForSkill({ skillName, currentLevel, targetLevel, careerGoal = '', relatedSlugs = [] }) {
  const fallback = buildFallbackRoadmap({ skillName, currentLevel, targetLevel, relatedSlugs });
  const ai = getGeminiClient();
  if (!ai) {
    return { ...fallback, source: 'fallback' };
  }

  try {
    const prompt = `Create a practical, concise learning roadmap for a college student studying "${skillName}".
Current proficiency: ${currentLevel}/5 (${LEVEL_NAMES[currentLevel] || 'Beginner'}).
Target proficiency: ${targetLevel}/5 (${LEVEL_NAMES[targetLevel] || 'Advanced'}).
Career goal: ${careerGoal || 'Software & technical mastery'}.
Return 4 structured roadmap topics, 3 concrete next steps, 4 related topics, and 3 short learning activities.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmapTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                },
                required: ['title', 'description', 'estimatedMinutes'],
              },
            },
            recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            relatedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['roadmapTopics', 'recommendedNextSteps', 'relatedTopics', 'recommendedActivities'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!Array.isArray(parsed.roadmapTopics) || parsed.roadmapTopics.length === 0) {
      return { ...fallback, source: 'fallback' };
    }

    const roadmapTopics = parsed.roadmapTopics.slice(0, 6).map((t, idx) => ({
      topicId: `topic-${idx + 1}`,
      title: String(t.title || `${skillName} Milestone ${idx + 1}`).slice(0, 140),
      description: String(t.description || '').slice(0, 300),
      estimatedMinutes: Math.min(180, Math.max(15, Number(t.estimatedMinutes) || 35)),
      completed: false,
      completedAt: null,
    }));

    return {
      roadmapTopics,
      recommendedNextSteps: (parsed.recommendedNextSteps || fallback.recommendedNextSteps).slice(0, 4),
      relatedTopics: (parsed.relatedTopics || fallback.relatedTopics).slice(0, 5),
      recommendedActivities: (parsed.recommendedActivities || fallback.recommendedActivities).slice(0, 4),
      milestones: fallback.milestones,
      source: 'ai',
    };
  } catch (err) {
    console.warn('[SkillAnalyzer Roadmap Fallback]', err?.message || err);
    return { ...fallback, source: 'fallback' };
  }
}

export async function findPlatformOpportunitiesForStudent({ userId, goals, userSkills, helpedSkillNames }) {
  const gapSkills = [...goals]
    .sort((a, b) => (b.targetLevel - b.currentLevel) - (a.targetLevel - a.currentLevel))
    .slice(0, 4);

  const skillCatalog = await Skill.find().lean();
  const catalogByName = new Map(skillCatalog.map((s) => [s.name.toLowerCase(), s]));

  const targetSkillIds = [];
  for (const g of gapSkills) {
    if (g.skillId) targetSkillIds.push(g.skillId);
    else {
      const cat = catalogByName.get(g.skillName.toLowerCase());
      if (cat) targetSkillIds.push(cat._id);
    }
  }

  // 1. Find real peer mentors on QuickFix who excel in the student's gap skills
  const mentorSkillQuery = targetSkillIds.length > 0 ? { skillId: { $in: targetSkillIds } } : {};
  const mentorSkills = await UserSkill.find(mentorSkillQuery)
    .populate('skillId', 'name slug category')
    .lean();

  const candidateScoreMap = new Map();
  const profWeight = { Advanced: 3, Intermediate: 2, Beginner: 1 };

  for (const ms of mentorSkills) {
    if (!ms.skillId || String(ms.userId) === String(userId)) continue;
    const uid = String(ms.userId);
    const entry = candidateScoreMap.get(uid) || { score: 0, matchedSkills: [] };
    entry.score += profWeight[ms.proficiency] || 1;
    entry.matchedSkills.push({
      name: ms.skillId.name,
      proficiency: ms.proficiency,
    });
    candidateScoreMap.set(uid, entry);
  }

  const candidateIds = Array.from(candidateScoreMap.keys());
  let peerMentors = [];
  if (candidateIds.length > 0) {
    const users = await User.find({ _id: { $in: candidateIds } })
      .select('fullName avatarUrl college branch academicYear completedSessions contributionPoints')
      .lean();
    peerMentors = users
      .map((u) => {
        const meta = candidateScoreMap.get(String(u._id));
        const finalScore = (meta?.score || 0) * 10 + Math.min(20, (u.completedSessions || 0) * 2);
        return {
          _id: u._id,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl || '',
          college: u.college || '',
          branch: u.branch || '',
          academicYear: u.academicYear || '',
          completedSessions: u.completedSessions || 0,
          matchedSkills: meta?.matchedSkills || [],
          score: finalScore,
          reason: meta?.matchedSkills?.length
            ? `Strong in ${meta.matchedSkills.map((s) => `${s.name} (${s.proficiency})`).slice(0, 2).join(', ')}`
            : 'Active campus mentor',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  // Fallback to top active peers if no direct skill overlap yet
  if (peerMentors.length === 0) {
    const fallbackPeers = await User.find({ _id: { $ne: userId } })
      .select('fullName avatarUrl college branch academicYear completedSessions')
      .sort({ completedSessions: -1, contributionPoints: -1 })
      .limit(3)
      .lean();
    peerMentors = fallbackPeers.map((u) => ({
      ...u,
      matchedSkills: [],
      reason: `${u.completedSessions || 0} completed QuickFix mentoring sessions`,
    }));
  }

  // 2. Find open campus doubts related to the student's tracked or strong skills (practice / teach)
  const ownAndTargetSkillIds = [
    ...new Set([
      ...targetSkillIds.map(String),
      ...userSkills.map((us) => String(us.skillId?._id || us.skillId)).filter(Boolean),
    ]),
  ];

  const doubtQuery = {
    status: { $in: ['Open', 'Pending Acceptance'] },
    authorId: { $ne: userId },
    ...(ownAndTargetSkillIds.length > 0 ? { skillId: { $in: ownAndTargetSkillIds } } : {}),
  };

  let relatedDoubts = await HelpRequest.find(doubtQuery)
    .populate('skillId', 'name slug')
    .populate('authorId', 'fullName')
    .sort({ bountyPoints: -1, createdAt: -1 })
    .limit(4)
    .lean();

  if (relatedDoubts.length === 0) {
    relatedDoubts = await HelpRequest.find({
      status: { $in: ['Open', 'Pending Acceptance'] },
      authorId: { $ne: userId },
    })
      .populate('skillId', 'name slug')
      .populate('authorId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
  }

  const practiceOpportunities = relatedDoubts.map((d) => ({
    _id: d._id,
    title: d.title,
    skillName: d.skillId?.name || 'General',
    bountyPoints: d.bountyPoints || 0,
    urgency: d.urgency || 'Medium',
    authorName: d.authorId?.fullName || 'Campus Peer',
    mode: helpedSkillNames.includes(d.skillId?.name)
      ? 'Reinforce by mentoring'
      : 'Learn from real campus blocker',
  }));

  return {
    peerMentors,
    practiceOpportunities,
  };
}

function buildDeterministicAnalysis({ user, goals, userSkills, helpedSkills, recentActivities }) {
  const sortedByGap = [...goals].sort((a, b) => {
    const gapA = Math.max(0, a.targetLevel - a.currentLevel);
    const gapB = Math.max(0, b.targetLevel - b.currentLevel);
    if (gapB !== gapA) return gapB - gapA;
    const prioRank = { high: 3, medium: 2, low: 1 };
    return (prioRank[b.priority] || 2) - (prioRank[a.priority] || 2);
  });

  const topGap = sortedByGap[0] || null;
  const biggestGaps = sortedByGap
    .filter((g) => g.targetLevel > g.currentLevel)
    .slice(0, 3)
    .map((g) => ({
      skillName: g.skillName,
      currentLevel: g.currentLevel,
      targetLevel: g.targetLevel,
      gap: g.targetLevel - g.currentLevel,
      rationale:
        g.recommendedNextSteps?.[0] ||
        `Advance ${g.skillName} from Level ${g.currentLevel} to Level ${g.targetLevel} via guided roadmap practice.`,
    }));

  const prioritySkill = topGap
    ? topGap.skillName
    : user.learningInterests?.[0] || userSkills[0]?.skillId?.name || 'DSA';

  const nextSteps = [];
  if (topGap) {
    const pendingTopic = (topGap.roadmapTopics || []).find((t) => !t.completed);
    if (pendingTopic) {
      nextSteps.push(`Complete the next roadmap milestone in ${topGap.skillName}: "${pendingTopic.title}".`);
    } else {
      nextSteps.push(`Log a 30-minute deliberate study session focused on ${topGap.skillName}.`);
    }
  } else {
    nextSteps.push('Add at least 2 target skills in Skill Gap Analyzer to unlock personalized roadmap tracking.');
  }

  if (helpedSkills.length > 0) {
    nextSteps.push(
      `Leverage your mentoring strength in ${helpedSkills.slice(0, 2).join(' & ')} by claiming open doubts for XP while studying ${prioritySkill}.`
    );
  } else {
    nextSteps.push('Claim an open campus doubt in a skill you know to build confidence and earn Verified XP.');
  }

  if (recentActivities.length < 3) {
    nextSteps.push('Establish a 3-day learning streak by logging one short completed activity each day.');
  } else {
    nextSteps.push(`Maintain your momentum with 25-45 minute daily blocks focused on ${prioritySkill}.`);
  }

  const summary = topGap
    ? `${user.fullName}'s highest-impact gap is ${topGap.skillName} (currently Level ${topGap.currentLevel}/5 toward target ${topGap.targetLevel}/5)${
        user.careerGoal ? ` aligned with the goal of ${user.careerGoal}` : ''
      }.`
    : `Add your target skills and career goal to generate a tailored skill-gap breakdown and weekly study cadence.`;

  const perSkillUpdates = sortedByGap.map((g) => {
    const fallback = buildFallbackRoadmap({
      skillName: g.skillName,
      currentLevel: g.currentLevel,
      targetLevel: g.targetLevel,
    });
    return {
      skillName: g.skillName,
      recommendedNextSteps: g.recommendedNextSteps?.length ? g.recommendedNextSteps : fallback.recommendedNextSteps,
      relatedTopics: g.relatedTopics?.length ? g.relatedTopics : fallback.relatedTopics,
    };
  });

  return {
    source: 'fallback',
    generatedAt: new Date().toISOString(),
    summary,
    prioritySkill,
    biggestGaps,
    nextSteps,
    perSkillUpdates,
  };
}

export async function runSkillGapAnalysis(userId) {
  const [user, goals, userSkills, helpedSessions, recentActivities] = await Promise.all([
    User.findById(userId)
      .select('fullName college branch academicYear careerGoal learningInterests currentStreak longestStreak')
      .lean(),
    SkillGoal.find({ userId }).sort({ updatedAt: -1 }).lean(),
    UserSkill.find({ userId }).populate('skillId', 'name category').lean(),
    HelpSession.find({ helperId: userId, status: 'Completed' })
      .populate({
        path: 'requestId',
        select: 'title skillId',
        populate: { path: 'skillId', select: 'name' },
      })
      .sort({ completedAt: -1 })
      .limit(15)
      .lean(),
    LearningActivity.find({ userId, completed: true }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  if (!user) throw new Error('User not found.');

  const helpedSkillCounts = new Map();
  for (const s of helpedSessions) {
    const sName = s.requestId?.skillId?.name;
    if (sName) helpedSkillCounts.set(sName, (helpedSkillCounts.get(sName) || 0) + 1);
  }
  const helpedSkillNames = Array.from(helpedSkillCounts.keys());

  const [opportunities, fallbackAnalysis] = await Promise.all([
    findPlatformOpportunitiesForStudent({ userId, goals, userSkills, helpedSkillNames }),
    Promise.resolve(
      buildDeterministicAnalysis({
        user,
        goals,
        userSkills,
        helpedSkills: helpedSkillNames,
        recentActivities,
      })
    ),
  ]);

  const ai = getGeminiClient();
  let finalAnalysis = fallbackAnalysis;

  if (ai && (goals.length > 0 || userSkills.length > 0 || user.careerGoal || (user.learningInterests || []).length > 0)) {
    try {
      const profileSnapshot = {
        branch: user.branch,
        academicYear: user.academicYear,
        careerGoal: user.careerGoal,
        learningInterests: user.learningInterests,
        currentSkills: userSkills.map((us) => ({
          name: us.skillId?.name,
          proficiency: us.proficiency,
        })),
        trackedSkillGoals: goals.map((g) => ({
          skillName: g.skillName,
          currentLevel: g.currentLevel,
          targetLevel: g.targetLevel,
          gap: Math.max(0, g.targetLevel - g.currentLevel),
          progressPercent: g.progressPercent,
        })),
        helpedPeersIn: helpedSkillNames,
        recentStudyTopics: recentActivities.slice(0, 6).map((a) => `${a.skillName}: ${a.topic} (${a.durationMinutes}m)`),
      };

      const prompt = `Analyze this student's skill profile and provide personalized skill-gap recommendations.
Student profile JSON:
${JSON.stringify(profileSnapshot)}

Rules:
- Identify the single top prioritySkill to focus on right now.
- List up to 3 biggestGaps with rationale grounded in their actual skills and career goal.
- Provide 3-4 actionable nextSteps.
- For each tracked skill in trackedSkillGoals, provide 2 concise recommendedNextSteps and 3 relatedTopics.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              prioritySkill: { type: Type.STRING },
              biggestGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skillName: { type: Type.STRING },
                    currentLevel: { type: Type.INTEGER },
                    targetLevel: { type: Type.INTEGER },
                    gap: { type: Type.INTEGER },
                    rationale: { type: Type.STRING },
                  },
                  required: ['skillName', 'rationale'],
                },
              },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              perSkillUpdates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skillName: { type: Type.STRING },
                    recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    relatedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['skillName', 'recommendedNextSteps', 'relatedTopics'],
                },
              },
            },
            required: ['summary', 'prioritySkill', 'biggestGaps', 'nextSteps'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.summary && parsed.prioritySkill) {
        finalAnalysis = {
          source: 'ai',
          generatedAt: new Date().toISOString(),
          summary: parsed.summary,
          prioritySkill: parsed.prioritySkill,
          biggestGaps: Array.isArray(parsed.biggestGaps) && parsed.biggestGaps.length
            ? parsed.biggestGaps.slice(0, 3)
            : fallbackAnalysis.biggestGaps,
          nextSteps: Array.isArray(parsed.nextSteps) && parsed.nextSteps.length
            ? parsed.nextSteps.slice(0, 4)
            : fallbackAnalysis.nextSteps,
          perSkillUpdates: Array.isArray(parsed.perSkillUpdates) ? parsed.perSkillUpdates : [],
        };
      }
    } catch (err) {
      console.warn('[SkillAnalyzer Gemini Fallback]', err?.message || err);
      finalAnalysis = fallbackAnalysis;
    }
  }

  // Persist per-skill recommendations back onto SkillGoal docs
  if (Array.isArray(finalAnalysis.perSkillUpdates)) {
    for (const upd of finalAnalysis.perSkillUpdates) {
      if (!upd?.skillName) continue;
      await SkillGoal.updateOne(
        { userId, skillNameLower: upd.skillName.trim().toLowerCase() },
        {
          $set: {
            recommendedNextSteps: (upd.recommendedNextSteps || []).slice(0, 4),
            relatedTopics: (upd.relatedTopics || []).slice(0, 5),
          },
        }
      ).catch(() => {});
    }
  }

  const analysisPayload = {
    source: finalAnalysis.source,
    generatedAt: finalAnalysis.generatedAt,
    summary: finalAnalysis.summary,
    prioritySkill: finalAnalysis.prioritySkill,
    biggestGaps: finalAnalysis.biggestGaps,
    nextSteps: finalAnalysis.nextSteps,
    helpedSkills: Array.from(helpedSkillCounts.entries()).map(([name, count]) => ({ name, count })),
    peerMentors: opportunities.peerMentors,
    practiceOpportunities: opportunities.practiceOpportunities,
  };

  await User.updateOne(
    { _id: userId },
    { $set: { latestAiAnalysis: analysisPayload } }
  ).catch(() => {});

  return analysisPayload;
}
