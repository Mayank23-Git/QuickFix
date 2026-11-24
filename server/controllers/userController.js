import { User } from '../models/User.js';
import { UserSkill } from '../models/UserSkill.js';
import { Skill } from '../models/Skill.js';
import { HelpRequest } from '../models/HelpRequest.js';
import { HelpSession } from '../models/HelpSession.js';
import { UserBadge } from '../models/UserBadge.js';
import { computeSkillBadges } from '../services/badgeService.js';
import { findMatchedHelpersForRequest } from '../services/matchingService.js';
import {
  asTrimmedString,
  escapeRegex,
  isValidObjectId,
  sanitizeAvatarUrl,
} from '../utils/sanitize.js';

export async function listStudents(req, res) {
  try {
    const search = asTrimmedString(req.query?.search, 80);
    const skillId = asTrimmedString(req.query?.skillId, 40);

    let filteredUserIds = null;
    if (skillId && isValidObjectId(skillId)) {
      const matches = await UserSkill.find({ skillId }).select('userId').lean();
      filteredUserIds = matches.map((m) => m.userId);
    }

    const query = {};
    if (filteredUserIds !== null) {
      query._id = { $in: filteredUserIds };
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ fullName: rx }, { college: rx }, { branch: rx }, { bio: rx }];
    }

    const users = await User.find(query)
      .select('fullName avatarUrl college branch academicYear bio contributionPoints completedSessions isDemo createdAt')
      .sort({ contributionPoints: -1, completedSessions: -1 })
      .limit(40)
      .lean();

    const userIds = users.map((u) => u._id);
    const userSkills = await UserSkill.find({ userId: { $in: userIds } })
      .populate('skillId', 'name slug category')
      .lean();

    const skillsByUser = new Map();
    for (const us of userSkills) {
      const uid = String(us.userId);
      if (!skillsByUser.has(uid)) skillsByUser.set(uid, []);
      if (us.skillId) {
        skillsByUser.get(uid).push({
          _id: us._id,
          skillId: us.skillId._id,
          name: us.skillId.name,
          slug: us.skillId.slug,
          category: us.skillId.category,
          proficiency: us.proficiency,
        });
      }
    }

    const enriched = users.map((u) => {
      const skills = skillsByUser.get(String(u._id)) || [];
      return {
        ...u,
        skills,
        badges: computeSkillBadges(u, skills),
      };
    });

    return res.json({ students: enriched });
  } catch (error) {
    console.error('[List Students Error]', error);
    return res.status(500).json({ error: 'Failed to load students.' });
  }
}

export async function getStudentProfile(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid student profile ID.' });
    }

    const isOwner = req.user && String(req.user._id) === id;
    const selectFields = isOwner
      ? '-passwordHash'
      : 'fullName avatarUrl college branch academicYear bio contributionPoints achievementXp completedSessions isDemo createdAt';

    const user = await User.findById(id).select(selectFields).lean();
    if (!user) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const [userSkills, recentRequests, helpedCount, redeemedBadges] = await Promise.all([
      UserSkill.find({ userId: id }).populate('skillId', 'name slug category').lean(),
      HelpRequest.find({ authorId: id })
        .populate('skillId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      HelpSession.countDocuments({ helperId: id, status: 'Completed' }),
      UserBadge.find({ userId: id, status: 'valid' })
        .select('badgeId badgeName badgeDescription category icon achievementId credentialId issuedAt xpThresholdAtIssue')
        .sort({ issuedAt: -1 })
        .lean(),
    ]);

    const skills = userSkills
      .filter((us) => us.skillId)
      .map((us) => ({
        _id: us._id,
        skillId: us.skillId._id,
        name: us.skillId.name,
        slug: us.skillId.slug,
        category: us.skillId.category,
        proficiency: us.proficiency,
      }));

    return res.json({
      profile: {
        ...user,
        skills,
        badges: computeSkillBadges(user, skills),
        redeemedBadges,
        helpedCount,
        recentRequests,
        isOwner: Boolean(isOwner),
      },
    });
  } catch (error) {
    console.error('[Get Profile Error]', error);
    return res.status(500).json({ error: 'Failed to load student profile.' });
  }
}

export async function updateMyProfile(req, res) {
  try {
    if (req.params.id && req.params.id !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not permitted to edit another student profile.' });
    }

    const fullName = asTrimmedString(req.body?.fullName, 80);
    const college = asTrimmedString(req.body?.college, 120);
    const branch = asTrimmedString(req.body?.branch, 80);
    const academicYear = asTrimmedString(req.body?.academicYear, 30);
    const bio = asTrimmedString(req.body?.bio, 400);
    const avatarUrl = sanitizeAvatarUrl(req.body?.avatarUrl);
    const careerGoal =
      req.body?.careerGoal !== undefined ? asTrimmedString(req.body.careerGoal, 160) : undefined;
    const learningInterests =
      req.body?.learningInterests !== undefined
        ? [
            ...new Set(
              (Array.isArray(req.body.learningInterests)
                ? req.body.learningInterests
                : String(req.body.learningInterests).split(',')
              )
                .map((item) => asTrimmedString(item, 50))
                .filter(Boolean)
                .slice(0, 12)
            ),
          ]
        : undefined;

    if (fullName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }

    const allowedYears = ['', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate', 'Other'];
    const safeYear = allowedYears.includes(academicYear) ? academicYear : '';

    const updateSet = {
      fullName,
      college,
      branch,
      academicYear: safeYear,
      bio,
      avatarUrl,
    };
    if (careerGoal !== undefined) updateSet.careerGoal = careerGoal;
    if (learningInterests !== undefined) updateSet.learningInterests = learningInterests;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateSet },
      { new: true, runValidators: true }
    )
      .select('-passwordHash')
      .lean();

    const userSkills = await UserSkill.find({ userId: req.user._id })
      .populate('skillId', 'name slug category')
      .lean();

    const skills = userSkills
      .filter((us) => us.skillId)
      .map((us) => ({
        _id: us._id,
        skillId: us.skillId._id,
        name: us.skillId.name,
        slug: us.skillId.slug,
        category: us.skillId.category,
        proficiency: us.proficiency,
      }));

    return res.json({
      user: {
        ...updated,
        skills,
        badges: computeSkillBadges(updated, skills),
      },
    });
  } catch (error) {
    console.error('[Update Profile Error]', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

export async function updateMyThemePreference(req, res) {
  try {
    const theme = asTrimmedString(req.body?.themePreference, 20).toLowerCase();
    if (!['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({ error: 'Theme preference must be light, dark, or system.' });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { themePreference: theme } }
    );

    return res.json({ themePreference: theme });
  } catch (error) {
    console.error('[Update Theme Preference Error]', error);
    return res.status(500).json({ error: 'Failed to update theme preference.' });
  }
}

export async function upsertMySkill(req, res) {
  try {
    const skillId = asTrimmedString(req.body?.skillId, 40);
    const proficiency = asTrimmedString(req.body?.proficiency, 20);

    if (!isValidObjectId(skillId)) {
      return res.status(400).json({ error: 'Please select a valid skill.' });
    }
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(proficiency)) {
      return res.status(400).json({ error: 'Proficiency must be Beginner, Intermediate, or Advanced.' });
    }

    const skillExists = await Skill.findById(skillId).lean();
    if (!skillExists) {
      return res.status(404).json({ error: 'Skill not found in catalog.' });
    }

    await UserSkill.findOneAndUpdate(
      { userId: req.user._id, skillId },
      { $set: { proficiency } },
      { upsert: true, new: true, runValidators: true }
    );

    const userSkills = await UserSkill.find({ userId: req.user._id })
      .populate('skillId', 'name slug category')
      .lean();

    return res.json({
      skills: userSkills
        .filter((us) => us.skillId)
        .map((us) => ({
          _id: us._id,
          skillId: us.skillId._id,
          name: us.skillId.name,
          slug: us.skillId.slug,
          category: us.skillId.category,
          proficiency: us.proficiency,
        })),
    });
  } catch (error) {
    console.error('[Upsert Skill Error]', error);
    return res.status(500).json({ error: 'Failed to save skill.' });
  }
}

export async function removeMySkill(req, res) {
  try {
    const { skillId } = req.params;
    if (!isValidObjectId(skillId)) {
      return res.status(400).json({ error: 'Invalid skill ID.' });
    }

    await UserSkill.findOneAndDelete({ userId: req.user._id, skillId });

    const userSkills = await UserSkill.find({ userId: req.user._id })
      .populate('skillId', 'name slug category')
      .lean();

    return res.json({
      skills: userSkills
        .filter((us) => us.skillId)
        .map((us) => ({
          _id: us._id,
          skillId: us.skillId._id,
          name: us.skillId.name,
          slug: us.skillId.slug,
          category: us.skillId.category,
          proficiency: us.proficiency,
        })),
    });
  } catch (error) {
    console.error('[Remove Skill Error]', error);
    return res.status(500).json({ error: 'Failed to remove skill.' });
  }
}

export async function getDashboardData(req, res) {
  try {
    const userId = req.user._id;

    const [mySkillsRaw, myRequests, mySessions, openRequestsCount] = await Promise.all([
      UserSkill.find({ userId }).populate('skillId', 'name slug category relatedSlugs').lean(),
      HelpRequest.find({ authorId: userId })
        .populate('skillId', 'name slug')
        .populate('helperId', 'fullName avatarUrl')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      HelpSession.find({ $or: [{ requesterId: userId }, { helperId: userId }] })
        .populate({
          path: 'requestId',
          select: 'title skillId urgency bountyPoints status',
          populate: { path: 'skillId', select: 'name slug' },
        })
        .populate('requesterId', 'fullName avatarUrl')
        .populate('helperId', 'fullName avatarUrl')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
      HelpRequest.countDocuments({ status: { $in: ['Open', 'Pending Acceptance'] } }),
    ]);

    const mySkills = mySkillsRaw
      .filter((us) => us.skillId)
      .map((us) => ({
        _id: us._id,
        skillId: us.skillId._id,
        name: us.skillId.name,
        slug: us.skillId.slug,
        category: us.skillId.category,
        relatedSlugs: us.skillId.relatedSlugs || [],
        proficiency: us.proficiency,
      }));

    // Calculate profile completion
    const completionFields = [
      { label: 'Full Name', done: Boolean(req.user.fullName) },
      { label: 'College', done: Boolean(req.user.college) },
      { label: 'Branch / Department', done: Boolean(req.user.branch) },
      { label: 'Academic Year', done: Boolean(req.user.academicYear) },
      { label: 'Short Bio', done: Boolean(req.user.bio) },
      { label: 'At least 1 Skill', done: mySkills.length > 0 },
    ];
    const completedCount = completionFields.filter((f) => f.done).length;
    const profileCompletion = Math.round((completedCount / completionFields.length) * 100);

    // Recommended open doubts matching the student's skills (or newest open doubts if no skills yet)
    const mySkillIds = mySkills.map((s) => s.skillId);
    const recommendedQuery = {
      status: { $in: ['Open', 'Pending Acceptance'] },
      authorId: { $ne: userId },
    };
    if (mySkillIds.length > 0) {
      recommendedQuery.skillId = { $in: mySkillIds };
    }

    let recommendedDoubts = await HelpRequest.find(recommendedQuery)
      .populate('authorId', 'fullName avatarUrl college branch isDemo')
      .populate('skillId', 'name slug category')
      .sort({ bountyPoints: -1, createdAt: -1 })
      .limit(5)
      .lean();

    if (recommendedDoubts.length === 0) {
      recommendedDoubts = await HelpRequest.find({
        status: { $in: ['Open', 'Pending Acceptance'] },
        authorId: { $ne: userId },
      })
        .populate('authorId', 'fullName avatarUrl college branch isDemo')
        .populate('skillId', 'name slug category')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
    }

    // Skill-matched helpers for user's latest open doubt (if any), else top skilled peers
    let matchedStudents = [];
    const firstOpenOwnDoubt = myRequests.find((r) => ['Open', 'Pending Acceptance'].includes(r.status));
    if (firstOpenOwnDoubt) {
      matchedStudents = await findMatchedHelpersForRequest(firstOpenOwnDoubt, 4);
    } else {
      const topPeers = await User.find({ _id: { $ne: userId } })
        .select('fullName avatarUrl college branch academicYear contributionPoints completedSessions isDemo')
        .sort({ completedSessions: -1, contributionPoints: -1 })
        .limit(4)
        .lean();
      const peerSkills = await UserSkill.find({ userId: { $in: topPeers.map((p) => p._id) } })
        .populate('skillId', 'name slug')
        .lean();
      matchedStudents = topPeers.map((peer) => {
        const skills = peerSkills
          .filter((ps) => String(ps.userId) === String(peer._id) && ps.skillId)
          .slice(0, 3)
          .map((ps) => ({ _id: ps.skillId._id, name: ps.skillId.name, proficiency: ps.proficiency }));
        return {
          user: peer,
          relevantSkills: skills,
          matchScore: null,
          matchType: 'Active Campus Peer',
          matchExplanation: `${peer.completedSessions || 0} completed mentoring sessions`,
        };
      });
    }

    const activeSessions = mySessions.filter((s) =>
      ['Accepted', 'Claimed', 'Ready to Join', 'In Progress'].includes(s.status)
    );
    const completedSessionsList = mySessions.filter((s) => s.status === 'Completed');

    return res.json({
      dashboard: {
        profileCompletion,
        missingFields: completionFields.filter((f) => !f.done).map((f) => f.label),
        mySkills,
        badges: computeSkillBadges(req.user, mySkills),
        openRequestsCount,
        myRequests,
        recommendedDoubts,
        matchedStudents,
        activeSessions,
        completedSessions: completedSessionsList,
        skillGrowthSummary: {
          currentStreak: req.user.currentStreak || 0,
          longestStreak: req.user.longestStreak || 0,
          totalLearningDays: req.user.totalLearningDays || 0,
          careerGoal: req.user.careerGoal || '',
        },
      },
    });
  } catch (error) {
    console.error('[Dashboard Error]', error);
    return res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
}
