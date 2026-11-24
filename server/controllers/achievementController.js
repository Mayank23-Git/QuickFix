import crypto from 'crypto';
import { AchievementRule } from '../models/AchievementRule.js';
import { BadgeDefinition } from '../models/BadgeDefinition.js';
import { UserBadge } from '../models/UserBadge.js';
import { UserXPTransaction } from '../models/UserXPTransaction.js';
import { CredentialVerification } from '../models/CredentialVerification.js';
import { SpecialAchievementRequest } from '../models/SpecialAchievementRequest.js';
import { SessionFeedback } from '../models/SessionFeedback.js';
import { User } from '../models/User.js';
import {
  ensureAchievementCatalog,
  getDistinctHelpedStudentCount,
} from '../services/xpService.js';
import { asTrimmedString } from '../utils/sanitize.js';

function sanitizeExternalUrl(raw = '') {
  const val = asTrimmedString(raw, 400);
  if (!val) return '';
  try {
    const parsed = new URL(val);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function getMyAchievementsDashboard(req, res) {
  try {
    await ensureAchievementCatalog();

    const userId = req.user._id;
    const [freshUser, badgeDefs, userBadges, transactions, specialRequests, rules, distinctStudentsHelped, positiveFeedbackCount] =
      await Promise.all([
        User.findById(userId).select('achievementXp completedSessions fullName').lean(),
        BadgeDefinition.find({ active: true }).sort({ xpThreshold: 1, sortOrder: 1 }).lean(),
        UserBadge.find({ userId }).sort({ issuedAt: -1 }).lean(),
        UserXPTransaction.find({ userId }).sort({ createdAt: -1 }).limit(40).lean(),
        SpecialAchievementRequest.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
        AchievementRule.find({ active: true }).sort({ xpAmount: 1 }).lean(),
        getDistinctHelpedStudentCount(userId),
        SessionFeedback.countDocuments({ helperId: userId, helpful: true, rating: { $gte: 4 }, flagged: false }),
      ]);

    const currentXp = freshUser?.achievementXp || 0;
    const redeemedByBadgeId = new Map(userBadges.map((ub) => [ub.badgeId, ub]));

    const badges = badgeDefs.map((def) => {
      const redeemed = redeemedByBadgeId.get(def.badgeId) || null;
      const isRedeemed = Boolean(redeemed);
      const isMilestone = def.unlockType === 'milestone';
      const isEligible = isMilestone ? isRedeemed : currentXp >= def.xpThreshold;
      const state = isRedeemed ? 'Earned' : isEligible ? 'Redeemable' : 'Locked';
      const progressPercent = isMilestone
        ? isRedeemed
          ? 100
          : 0
        : def.xpThreshold > 0
        ? Math.min(100, Math.round((currentXp / def.xpThreshold) * 100))
        : 100;
      const xpRemaining = isMilestone ? 0 : Math.max(0, def.xpThreshold - currentXp);

      return {
        _id: def._id,
        badgeId: def.badgeId,
        name: def.name,
        description: def.description,
        icon: def.icon,
        xpThreshold: def.xpThreshold,
        unlockType: def.unlockType || 'xp',
        milestoneKey: def.milestoneKey || '',
        achievementCriteria: def.achievementCriteria,
        category: def.category,
        active: def.active,
        state,
        progressPercent,
        xpRemaining,
        earnedBadge: redeemed
          ? {
              achievementId: redeemed.achievementId,
              credentialId: redeemed.credentialId,
              issuedAt: redeemed.issuedAt,
              status: redeemed.status,
              xpAtIssue: redeemed.xpAtIssue,
            }
          : null,
      };
    });

    const earnedCount = badges.filter((b) => b.state === 'Earned' && b.earnedBadge?.status !== 'revoked').length;
    const redeemableCount = badges.filter((b) => b.state === 'Redeemable').length;
    const lockedCount = badges.filter((b) => b.state === 'Locked').length;
    const nextUpcoming = badges.find((b) => b.state === 'Locked' && b.unlockType !== 'milestone') || null;

    const approvedResourcesCount = specialRequests.filter(
      (r) => r.requestType === 'approved_resource' && r.status === 'Approved'
    ).length;
    const approvedWorkshopsCount = specialRequests.filter(
      (r) => r.requestType === 'approved_workshop' && r.status === 'Approved'
    ).length;

    return res.json({
      achievementXp: currentXp,
      summary: {
        totalXp: currentXp,
        totalBadgesEarned: earnedCount,
        availableBadges: badges.length,
        redeemableCount,
        lockedCount,
      },
      contributionStats: {
        completedSessions: freshUser?.completedSessions || 0,
        distinctStudentsHelped,
        positiveFeedbackCount,
        approvedResourcesCount,
        approvedWorkshopsCount,
      },
      nextUpcoming,
      badges,
      earnedBadges: userBadges,
      transactions,
      specialRequests,
      rules,
    });
  } catch (error) {
    console.error('[Achievements Dashboard Error]', error);
    return res.status(500).json({ error: 'Failed to load achievements dashboard.' });
  }
}

export async function redeemBadge(req, res) {
  let createdUserBadge = null;
  try {
    await ensureAchievementCatalog();

    const badgeId = asTrimmedString(req.params.badgeId, 80).toLowerCase();
    if (!badgeId) {
      return res.status(400).json({ error: 'Badge identifier is required.' });
    }

    const [badgeDef, freshUser] = await Promise.all([
      BadgeDefinition.findOne({ badgeId }).lean(),
      User.findById(req.user._id).select('fullName achievementXp').lean(),
    ]);

    if (!badgeDef || !badgeDef.active) {
      return res.status(404).json({ error: 'This badge is not currently available for redemption.' });
    }
    if (badgeDef.unlockType === 'milestone') {
      return res.status(403).json({
        error: 'This milestone badge unlocks automatically when you complete its learning goal or streak criteria.',
      });
    }
    if (!freshUser) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    const currentXp = freshUser.achievementXp || 0;
    if (currentXp < badgeDef.xpThreshold) {
      return res.status(403).json({
        error: `You need ${badgeDef.xpThreshold} XP to redeem ${badgeDef.name} (current XP: ${currentXp}).`,
      });
    }

    const existing = await UserBadge.findOne({
      userId: req.user._id,
      badgeId: badgeDef.badgeId,
    }).lean();
    if (existing) {
      return res.status(409).json({ error: 'You have already redeemed this badge.' });
    }

    const year = new Date().getFullYear();
    const randHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const randHex2 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const achievementId = `ACH-QF-${year}-${randHex}`;
    const credentialId = `QF-${year}-${randHex2}`;
    const issuedAt = new Date();

    // Note: XP is permanent and NEVER deducted upon badge redemption.
    createdUserBadge = await UserBadge.create({
      userId: req.user._id,
      badgeDefinitionId: badgeDef._id,
      badgeId: badgeDef.badgeId,
      achievementId,
      credentialId,
      badgeName: badgeDef.name,
      badgeDescription: badgeDef.description,
      achievementCriteria: badgeDef.achievementCriteria,
      category: badgeDef.category,
      icon: badgeDef.icon || 'award',
      xpThresholdAtIssue: badgeDef.xpThreshold,
      xpAtIssue: currentXp,
      issuedAt,
      status: 'valid',
    });

    const verification = await CredentialVerification.create({
      credentialId,
      achievementId,
      userBadgeId: createdUserBadge._id,
      userId: req.user._id,
      recipientDisplayName: freshUser.fullName,
      badgeId: badgeDef.badgeId,
      credentialName: badgeDef.name,
      badgeDescription: badgeDef.description,
      achievementCriteria: badgeDef.achievementCriteria,
      category: badgeDef.category,
      issuingPlatform: 'PeerUp',
      issuedAt,
      status: 'valid',
    });

    return res.status(201).json({
      message: `${badgeDef.name} redeemed! Your verified credential (${credentialId}) is ready.`,
      userBadge: createdUserBadge,
      verification: {
        credentialId: verification.credentialId,
        achievementId: verification.achievementId,
        credentialName: verification.credentialName,
        recipientDisplayName: verification.recipientDisplayName,
        issuingPlatform: verification.issuingPlatform,
        issuedAt: verification.issuedAt,
        status: verification.status,
      },
      achievementXp: currentXp,
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (createdUserBadge?._id) {
        await UserBadge.deleteOne({ _id: createdUserBadge._id }).catch(() => {});
      }
      return res.status(409).json({ error: 'This badge has already been redeemed.' });
    }
    if (createdUserBadge?._id) {
      await UserBadge.deleteOne({ _id: createdUserBadge._id }).catch(() => {});
    }
    console.error('[Redeem Badge Error]', error);
    return res.status(500).json({ error: 'Failed to redeem badge.' });
  }
}

export async function submitSpecialAchievementRequest(req, res) {
  try {
    const requestType = asTrimmedString(req.body?.requestType, 40);
    const title = asTrimmedString(req.body?.title, 140);
    const description = asTrimmedString(req.body?.description, 1200);
    const category = asTrimmedString(req.body?.category, 40) || 'Learning';
    const evidenceUrl = sanitizeExternalUrl(req.body?.evidenceUrl || '');

    if (!['approved_resource', 'approved_workshop'].includes(requestType)) {
      return res.status(400).json({ error: 'Invalid contribution type.' });
    }
    if (title.length < 6) {
      return res.status(400).json({ error: 'Title must be at least 6 characters.' });
    }
    if (description.length < 15) {
      return res.status(400).json({ error: 'Description must be at least 15 characters.' });
    }
    if (!['Mentoring', 'DSA', 'Community', 'Learning'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category selected.' });
    }
    if (evidenceUrl === null) {
      return res.status(400).json({ error: 'Evidence URL must start with http:// or https://.' });
    }

    const pendingCount = await SpecialAchievementRequest.countDocuments({
      userId: req.user._id,
      status: 'Pending',
    });
    if (pendingCount >= 5) {
      return res.status(429).json({
        error: 'You already have 5 pending contribution requests awaiting admin review.',
      });
    }

    const created = await SpecialAchievementRequest.create({
      userId: req.user._id,
      requestType,
      title,
      description,
      category,
      evidenceUrl,
      status: 'Pending',
    });

    return res.status(201).json({
      message: 'Contribution submitted for admin verification.',
      request: created,
    });
  } catch (error) {
    console.error('[Submit Special Request Error]', error);
    return res.status(500).json({ error: 'Failed to submit contribution request.' });
  }
}

export async function verifyPublicCredential(req, res) {
  try {
    const credentialId = asTrimmedString(req.params.credentialId, 80).toUpperCase();
    if (!credentialId) {
      return res.status(400).json({ error: 'Credential ID is required.' });
    }

    const record = await CredentialVerification.findOne({ credentialId })
      .select(
        'credentialId achievementId credentialName badgeDescription achievementCriteria category issuingPlatform recipientDisplayName issuedAt status revokedAt revocationReason'
      )
      .lean();

    if (!record) {
      return res.status(404).json({
        valid: false,
        error: 'Credential not found. Verify the credential ID and try again.',
      });
    }

    // Expose only minimal public verification details (no email, private user data, or internal DB IDs)
    return res.json({
      valid: record.status === 'valid',
      credential: {
        status: record.status,
        credentialId: record.credentialId,
        achievementId: record.achievementId,
        credentialName: record.credentialName,
        badgeDescription: record.badgeDescription,
        achievementCriteria: record.achievementCriteria,
        category: record.category,
        issuingPlatform: record.issuingPlatform || 'PeerUp',
        recipientDisplayName: record.recipientDisplayName,
        issuedAt: record.issuedAt,
        ...(record.status === 'revoked'
          ? {
              revokedAt: record.revokedAt,
              revocationReason: record.revocationReason || 'Revoked by administrator.',
            }
          : {}),
      },
    });
  } catch (error) {
    console.error('[Verify Credential Error]', error);
    return res.status(500).json({ error: 'Unable to verify credential right now.' });
  }
}
