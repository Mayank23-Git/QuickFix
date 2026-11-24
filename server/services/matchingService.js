import { User } from '../models/User.js';
import { UserSkill } from '../models/UserSkill.js';
import { Skill } from '../models/Skill.js';

const PROFICIENCY_WEIGHT = {
  Advanced: 20,
  Intermediate: 12,
  Beginner: 5,
};

const RELATED_PROFICIENCY_WEIGHT = {
  Advanced: 12,
  Intermediate: 8,
  Beginner: 4,
};

/**
 * Rule-based skill matching using actual MongoDB User + UserSkill + Skill data.
 * Prioritizes: 1) Exact skill match, 2) Related skills, 3) Proficiency, 4) Completed sessions & points.
 */
export async function findMatchedHelpersForRequest(helpRequest, limit = 6) {
  const targetSkill = await Skill.findById(helpRequest.skillId).lean();
  if (!targetSkill) return [];

  const relatedSlugs = new Set(targetSkill.relatedSlugs || []);
  const relatedSkills = relatedSlugs.size
    ? await Skill.find({ slug: { $in: Array.from(relatedSlugs) } }).select('_id name slug').lean()
    : [];

  const relatedSkillIds = new Set(relatedSkills.map((s) => String(s._id)));
  const relevantSkillIds = [targetSkill._id, ...relatedSkills.map((s) => s._id)];

  const candidateUserSkills = await UserSkill.find({
    skillId: { $in: relevantSkillIds },
    userId: { $ne: helpRequest.authorId },
  })
    .populate('skillId', 'name slug category')
    .lean();

  if (!candidateUserSkills.length) return [];

  const userIds = Array.from(new Set(candidateUserSkills.map((us) => String(us.userId))));
  const [users, allSkillsForCandidates] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select('fullName avatarUrl college branch academicYear bio contributionPoints completedSessions isDemo')
      .lean(),
    UserSkill.find({ userId: { $in: userIds } })
      .populate('skillId', 'name slug category')
      .lean(),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const skillsByUser = new Map();
  for (const us of allSkillsForCandidates) {
    const uid = String(us.userId);
    if (!skillsByUser.has(uid)) skillsByUser.set(uid, []);
    if (us.skillId) {
      skillsByUser.get(uid).push({
        _id: us.skillId._id,
        name: us.skillId.name,
        slug: us.skillId.slug,
        proficiency: us.proficiency,
      });
    }
  }

  const scoredCandidates = [];

  for (const uid of userIds) {
    const user = userMap.get(uid);
    if (!user) continue;

    const userSkills = skillsByUser.get(uid) || [];
    const exactMatch = userSkills.find((s) => String(s._id) === String(targetSkill._id));
    const relatedMatches = userSkills.filter((s) => relatedSkillIds.has(String(s._id)));

    let score = 0;
    const reasons = [];

    if (exactMatch) {
      score += 55 + (PROFICIENCY_WEIGHT[exactMatch.proficiency] || 8);
      reasons.push(`Matches ${targetSkill.name} (${exactMatch.proficiency})`);
    }

    if (relatedMatches.length > 0) {
      const bestRelated = relatedMatches.sort(
        (a, b) => (RELATED_PROFICIENCY_WEIGHT[b.proficiency] || 0) - (RELATED_PROFICIENCY_WEIGHT[a.proficiency] || 0)
      )[0];
      score += (exactMatch ? 12 : 28) + (RELATED_PROFICIENCY_WEIGHT[bestRelated.proficiency] || 4);
      const relatedNames = relatedMatches.slice(0, 2).map((r) => r.name).join(' & ');
      reasons.push(exactMatch ? `also skilled in ${relatedNames}` : `related ${relatedNames} skills`);
    }

    const sessionBonus = Math.min(15, (user.completedSessions || 0) * 3);
    score += sessionBonus;

    const pointsBonus = Math.min(8, Math.floor((user.contributionPoints || 0) / 40));
    score += pointsBonus;

    if ((user.completedSessions || 0) > 0) {
      reasons.push(`${user.completedSessions} completed ${user.completedSessions === 1 ? 'session' : 'sessions'}`);
    }

    const normalizedScore = Math.min(99, Math.max(20, score));

    scoredCandidates.push({
      user,
      relevantSkills: exactMatch
        ? [exactMatch, ...relatedMatches.slice(0, 3)]
        : relatedMatches.slice(0, 4),
      allSkillsCount: userSkills.length,
      matchScore: normalizedScore,
      matchType: 'Skill-Based Match',
      matchExplanation: reasons.join(' · '),
    });
  }

  scoredCandidates.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if ((b.user.completedSessions || 0) !== (a.user.completedSessions || 0)) {
      return (b.user.completedSessions || 0) - (a.user.completedSessions || 0);
    }
    return (b.user.contributionPoints || 0) - (a.user.contributionPoints || 0);
  });

  return scoredCandidates.slice(0, limit);
}

/**
 * Deterministic keyword-based skill categorization for doubt titles & descriptions.
 * Requires no external AI API.
 */
export function suggestSkillFromText(title = '', description = '', skills = []) {
  const haystack = `${title} ${description}`.toLowerCase();
  if (!haystack.trim() || !skills.length) return null;

  let bestMatch = null;
  let bestHits = 0;

  for (const skill of skills) {
    let hits = 0;
    const nameLower = skill.name.toLowerCase();
    if (haystack.includes(nameLower)) {
      hits += 3;
    }
    for (const kw of skill.keywords || []) {
      const kwLower = kw.toLowerCase();
      if (kwLower.length >= 2 && haystack.includes(kwLower)) {
        hits += 2;
      }
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestMatch = skill;
    }
  }

  return bestHits > 0 ? { skill: bestMatch, method: 'keyword-match' } : null;
}
