import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AdminConfig } from '../models/AdminConfig.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import { AchievementRule } from '../models/AchievementRule.js';
import { BadgeDefinition } from '../models/BadgeDefinition.js';
import { CredentialVerification } from '../models/CredentialVerification.js';
import { SpecialAchievementRequest } from '../models/SpecialAchievementRequest.js';
import { SessionFeedback } from '../models/SessionFeedback.js';
import { UserBadge } from '../models/UserBadge.js';
import { UserXPTransaction } from '../models/UserXPTransaction.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { awardVerifiedXp, ensureAchievementCatalog } from '../services/xpService.js';
import { createAndEmitNotification } from './notificationController.js';
import { asTrimmedString, isValidObjectId, parseBoundedInt } from '../utils/sanitize.js';

function timingSafeCompareText(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a || '')).digest();
  const hashB = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

async function logAdminAction({ actorId, action, targetType, targetId, reason = '', metadata = {} }) {
  await AdminAuditLog.create({
    actorId,
    action,
    targetType,
    targetId: String(targetId),
    reason,
    metadata,
  });
}

export async function getAdminBootstrapStatus(req, res) {
  try {
    const existingConfig = await AdminConfig.findOne({ key: 'primary' }).select('_id').lean();
    const canClaimWithEmail = env.adminEmails.includes((req.user.email || '').toLowerCase());
    return res.json({
      isAdmin: req.user.role === 'admin',
      hasConfiguredPasscode: Boolean(env.adminPasscode || existingConfig),
      canClaimWithEmail,
    });
  } catch (error) {
    console.error('[Admin Status Error]', error);
    return res.status(500).json({ error: 'Unable to check admin status.' });
  }
}

export async function claimAdminAccess(req, res) {
  try {
    if (req.user.role === 'admin') {
      return res.json({ message: 'Admin privileges already active.', role: 'admin' });
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    const userEmail = (req.user.email || '').toLowerCase();

    if (env.adminEmails.includes(userEmail)) {
      await User.updateOne({ _id: req.user._id }, { $set: { role: 'admin' } });
      await logAdminAction({
        actorId: req.user._id,
        action: 'admin_claimed_email',
        targetType: 'User',
        targetId: req.user._id,
        reason: 'Email matched ADMIN_EMAILS allowlist',
      });
      return res.json({ message: 'Admin access granted.', role: 'admin' });
    }

    if (env.adminPasscode) {
      if (!passcode || !timingSafeCompareText(passcode, env.adminPasscode)) {
        return res.status(403).json({ error: 'Invalid admin passcode.' });
      }
      await User.updateOne({ _id: req.user._id }, { $set: { role: 'admin' } });
      await logAdminAction({
        actorId: req.user._id,
        action: 'admin_claimed_env_passcode',
        targetType: 'User',
        targetId: req.user._id,
      });
      return res.json({ message: 'Admin access granted.', role: 'admin' });
    }

    const existingConfig = await AdminConfig.findOne({ key: 'primary' }).select('+passcodeHash');
    if (!existingConfig) {
      if (passcode.length < 8) {
        return res.status(400).json({
          error: 'First-time admin setup requires choosing a passcode of at least 8 characters.',
        });
      }
      const passcodeHash = await bcrypt.hash(passcode, 10);
      try {
        await AdminConfig.create({
          key: 'primary',
          passcodeHash,
          claimedByUserId: req.user._id,
        });
      } catch (err) {
        if (err?.code === 11000) {
          return res.status(409).json({
            error: 'Admin passcode was just configured. Please verify using that passcode.',
          });
        }
        throw err;
      }

      await User.updateOne({ _id: req.user._id }, { $set: { role: 'admin' } });
      await logAdminAction({
        actorId: req.user._id,
        action: 'admin_first_run_bootstrap',
        targetType: 'AdminConfig',
        targetId: 'primary',
        reason: 'Initial admin passcode established',
      });
      return res.json({ message: 'Admin workspace initialized and access granted.', role: 'admin' });
    }

    const valid = await bcrypt.compare(passcode, existingConfig.passcodeHash);
    if (!valid) {
      return res.status(403).json({ error: 'Invalid admin passcode.' });
    }

    await User.updateOne({ _id: req.user._id }, { $set: { role: 'admin' } });
    await logAdminAction({
      actorId: req.user._id,
      action: 'admin_claimed_db_passcode',
      targetType: 'User',
      targetId: req.user._id,
    });
    return res.json({ message: 'Admin access granted.', role: 'admin' });
  } catch (error) {
    console.error('[Claim Admin Error]', error);
    return res.status(500).json({ error: 'Failed to verify admin access.' });
  }
}

export async function getAdminOverview(_req, res) {
  try {
    await ensureAchievementCatalog();

    const [
      badges,
      rules,
      specialRequests,
      credentials,
      transactions,
      flaggedFeedback,
      auditLogs,
    ] = await Promise.all([
      BadgeDefinition.find().sort({ xpThreshold: 1, sortOrder: 1 }).lean(),
      AchievementRule.find().sort({ xpAmount: 1 }).lean(),
      SpecialAchievementRequest.find()
        .populate('userId', 'fullName email college branch achievementXp')
        .populate('reviewedBy', 'fullName')
        .sort({ status: -1, createdAt: -1 })
        .limit(60)
        .lean(),
      CredentialVerification.find()
        .populate('userId', 'fullName email')
        .sort({ issuedAt: -1 })
        .limit(80)
        .lean(),
      UserXPTransaction.find()
        .populate('userId', 'fullName email')
        .populate('actorId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(80)
        .lean(),
      SessionFeedback.find({ flagged: true })
        .populate('requesterId', 'fullName email')
        .populate('helperId', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      AdminAuditLog.find()
        .populate('actorId', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(60)
        .lean(),
    ]);

    return res.json({
      badges,
      rules,
      specialRequests,
      credentials,
      transactions,
      flaggedFeedback,
      auditLogs,
    });
  } catch (error) {
    console.error('[Admin Overview Error]', error);
    return res.status(500).json({ error: 'Failed to load admin console.' });
  }
}

export async function createBadge(req, res) {
  try {
    const rawId = asTrimmedString(req.body?.badgeId, 60)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '');
    const name = asTrimmedString(req.body?.name, 80);
    const description = asTrimmedString(req.body?.description, 300);
    const achievementCriteria = asTrimmedString(req.body?.achievementCriteria, 300);
    const category = asTrimmedString(req.body?.category, 30) || 'Mentoring';
    const icon = asTrimmedString(req.body?.icon, 40) || 'award';
    const xpThreshold = parseBoundedInt(req.body?.xpThreshold, 1, 100000, 100);
    const active = req.body?.active !== false;

    const badgeId =
      rawId ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    if (!badgeId || !/^[a-z0-9-]+$/.test(badgeId)) {
      return res.status(400).json({ error: 'Valid badgeId (lowercase letters, numbers, hyphens) is required.' });
    }
    if (name.length < 2 || description.length < 6 || achievementCriteria.length < 6) {
      return res.status(400).json({ error: 'Name, description, and achievement criteria are required.' });
    }
    if (!['Mentoring', 'DSA', 'Community', 'Learning'].includes(category)) {
      return res.status(400).json({ error: 'Invalid badge category.' });
    }

    const created = await BadgeDefinition.create({
      badgeId,
      name,
      description,
      icon,
      xpThreshold,
      achievementCriteria,
      category,
      active,
    });

    await logAdminAction({
      actorId: req.user._id,
      action: 'badge_created',
      targetType: 'BadgeDefinition',
      targetId: created.badgeId,
      metadata: { xpThreshold, category, active },
    });

    return res.status(201).json({ badge: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'A badge with this badgeId already exists.' });
    }
    console.error('[Create Badge Error]', error);
    return res.status(500).json({ error: 'Failed to create badge.' });
  }
}

export async function updateBadge(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid badge ID.' });
    }

    const existing = await BadgeDefinition.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Badge definition not found.' });
    }

    if (req.body?.name !== undefined) {
      const name = asTrimmedString(req.body.name, 80);
      if (name.length < 2) return res.status(400).json({ error: 'Badge name too short.' });
      existing.name = name;
    }
    if (req.body?.description !== undefined) {
      const desc = asTrimmedString(req.body.description, 300);
      if (desc.length < 6) return res.status(400).json({ error: 'Description too short.' });
      existing.description = desc;
    }
    if (req.body?.achievementCriteria !== undefined) {
      const crit = asTrimmedString(req.body.achievementCriteria, 300);
      if (crit.length < 6) return res.status(400).json({ error: 'Criteria too short.' });
      existing.achievementCriteria = crit;
    }
    if (req.body?.category !== undefined) {
      const cat = asTrimmedString(req.body.category, 30);
      if (!['Mentoring', 'DSA', 'Community', 'Learning'].includes(cat)) {
        return res.status(400).json({ error: 'Invalid category.' });
      }
      existing.category = cat;
    }
    if (req.body?.icon !== undefined) {
      existing.icon = asTrimmedString(req.body.icon, 40) || existing.icon;
    }
    if (req.body?.xpThreshold !== undefined) {
      existing.xpThreshold = parseBoundedInt(req.body.xpThreshold, 1, 100000, existing.xpThreshold);
    }
    if (req.body?.active !== undefined) {
      existing.active = Boolean(req.body.active);
    }

    await existing.save();

    await logAdminAction({
      actorId: req.user._id,
      action: 'badge_updated',
      targetType: 'BadgeDefinition',
      targetId: existing.badgeId,
      metadata: {
        xpThreshold: existing.xpThreshold,
        active: existing.active,
        category: existing.category,
      },
    });

    return res.json({ badge: existing });
  } catch (error) {
    console.error('[Update Badge Error]', error);
    return res.status(500).json({ error: 'Failed to update badge.' });
  }
}

export async function updateAchievementRule(req, res) {
  try {
    const ruleKey = asTrimmedString(req.params.ruleKey, 60).toLowerCase();
    const existing = await AchievementRule.findOne({ ruleKey });
    if (!existing) {
      return res.status(404).json({ error: 'Achievement rule not found.' });
    }

    if (req.body?.xpAmount !== undefined) {
      existing.xpAmount = parseBoundedInt(req.body.xpAmount, 0, 1000, existing.xpAmount);
    }
    if (req.body?.active !== undefined) {
      existing.active = Boolean(req.body.active);
    }
    if (req.body?.description !== undefined) {
      const desc = asTrimmedString(req.body.description, 400);
      if (desc.length >= 6) existing.description = desc;
    }

    await existing.save();

    await logAdminAction({
      actorId: req.user._id,
      action: 'xp_rule_updated',
      targetType: 'AchievementRule',
      targetId: existing.ruleKey,
      metadata: { xpAmount: existing.xpAmount, active: existing.active },
    });

    return res.json({ rule: existing });
  } catch (error) {
    console.error('[Update Rule Error]', error);
    return res.status(500).json({ error: 'Failed to update XP rule.' });
  }
}

export async function reviewSpecialAchievementRequest(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid request ID.' });
    }

    const decision = asTrimmedString(req.body?.decision, 20).toLowerCase();
    const reviewNote = asTrimmedString(req.body?.reviewNote, 300);

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approve or reject.' });
    }

    const existing = await SpecialAchievementRequest.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ error: 'Contribution request not found.' });
    }
    if (existing.status !== 'Pending') {
      return res.status(409).json({ error: 'This request has already been reviewed.' });
    }
    if (String(existing.userId) === String(req.user._id) && decision === 'approve') {
      return res.status(403).json({ error: 'Administrators cannot approve their own XP requests.' });
    }

    const nextStatus = decision === 'approve' ? 'Approved' : 'Rejected';
    const updated = await SpecialAchievementRequest.findOneAndUpdate(
      { _id: id, status: 'Pending' },
      {
        $set: {
          status: nextStatus,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          reviewNote,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ error: 'This request was just reviewed by another admin.' });
    }

    let xpAwarded = 0;
    if (decision === 'approve') {
      const xpResult = await awardVerifiedXp({
        userId: existing.userId,
        ruleKey: existing.requestType,
        referenceKey: `special_request:${String(existing._id)}`,
        sourceType: existing.requestType === 'approved_workshop' ? 'workshop' : 'resource',
        sourceId: String(existing._id),
        actorId: req.user._id,
        description: `${
          existing.requestType === 'approved_workshop' ? 'Approved workshop' : 'Approved resource'
        }: ${existing.title}`,
      });

      if (xpResult?.awarded) {
        xpAwarded = xpResult.xpAwarded;
        await SpecialAchievementRequest.updateOne(
          { _id: existing._id },
          { $set: { xpAwarded } }
        );
        updated.xpAwarded = xpAwarded;
      }
    }

    await logAdminAction({
      actorId: req.user._id,
      action: decision === 'approve' ? 'special_request_approved' : 'special_request_rejected',
      targetType: 'SpecialAchievementRequest',
      targetId: existing._id,
      reason: reviewNote || nextStatus,
      metadata: { xpAwarded, requestType: existing.requestType, recipientId: String(existing.userId) },
    });

    const populated = await SpecialAchievementRequest.findById(existing._id)
      .populate('userId', 'fullName email college branch achievementXp')
      .populate('reviewedBy', 'fullName')
      .lean();

    return res.json({
      message:
        decision === 'approve'
          ? `Approved! +${xpAwarded} verified XP awarded.`
          : 'Contribution request rejected.',
      request: populated,
    });
  } catch (error) {
    console.error('[Review Special Request Error]', error);
    return res.status(500).json({ error: 'Failed to review contribution request.' });
  }
}

export async function revokeCredential(req, res) {
  try {
    const credentialId = asTrimmedString(req.params.credentialId, 80).toUpperCase();
    const reason = asTrimmedString(req.body?.reason, 300);

    if (!credentialId) {
      return res.status(400).json({ error: 'Credential ID is required.' });
    }
    if (reason.length < 6) {
      return res.status(400).json({ error: 'Please provide an audit reason (at least 6 characters).' });
    }

    const now = new Date();
    const updatedCred = await CredentialVerification.findOneAndUpdate(
      { credentialId, status: 'valid' },
      {
        $set: {
          status: 'revoked',
          revokedAt: now,
          revokedBy: req.user._id,
          revocationReason: reason,
        },
      },
      { new: true }
    );

    if (!updatedCred) {
      const exists = await CredentialVerification.findOne({ credentialId }).lean();
      if (!exists) {
        return res.status(404).json({ error: 'Credential not found.' });
      }
      return res.status(409).json({ error: 'Credential is already revoked.' });
    }

    await UserBadge.updateOne(
      { _id: updatedCred.userBadgeId },
      { $set: { status: 'revoked' } }
    );

    await logAdminAction({
      actorId: req.user._id,
      action: 'credential_revoked',
      targetType: 'CredentialVerification',
      targetId: credentialId,
      reason,
      metadata: {
        userId: String(updatedCred.userId),
        credentialName: updatedCred.credentialName,
      },
    });

    return res.json({
      message: `Credential ${credentialId} has been revoked.`,
      credential: updatedCred,
    });
  } catch (error) {
    console.error('[Revoke Credential Error]', error);
    return res.status(500).json({ error: 'Failed to revoke credential.' });
  }
}

export async function reviewFlaggedFeedback(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid feedback ID.' });
    }

    const action = asTrimmedString(req.body?.action, 20).toLowerCase(); // 'approve' | 'dismiss'
    const reason = asTrimmedString(req.body?.reason, 300);

    if (!['approve', 'dismiss'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or dismiss.' });
    }

    const feedback = await SessionFeedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback record not found.' });
    }

    feedback.flagged = false;
    feedback.flagReason = reason || (action === 'approve' ? 'Cleared by admin' : 'Dismissed as abuse');

    let xpAwarded = 0;
    if (action === 'approve' && !feedback.xpAwarded && feedback.helpful && feedback.rating >= 4) {
      const xpResult = await awardVerifiedXp({
        userId: feedback.helperId,
        ruleKey: 'positive_feedback',
        referenceKey: `feedback:${String(feedback.sessionId)}`,
        sourceType: 'feedback',
        sourceId: String(feedback.sessionId),
        actorId: feedback.requesterId,
        description: `Admin-verified positive feedback (${feedback.rating}/5)`,
      });
      if (xpResult?.awarded) {
        xpAwarded = xpResult.xpAwarded;
        feedback.xpAwarded = true;
      }
    }

    await feedback.save();

    await UserXPTransaction.updateOne(
      { referenceKey: `feedback_flagged:${String(feedback.sessionId)}` },
      {
        $set: {
          status: action === 'approve' ? 'verified' : 'reversed',
          suspiciousReason: feedback.flagReason,
        },
      }
    ).catch(() => {});

    await logAdminAction({
      actorId: req.user._id,
      action: action === 'approve' ? 'flagged_feedback_approved' : 'flagged_feedback_dismissed',
      targetType: 'SessionFeedback',
      targetId: feedback._id,
      reason: feedback.flagReason,
      metadata: { xpAwarded },
    });

    return res.json({
      message: action === 'approve' ? 'Feedback cleared and XP awarded.' : 'Flagged feedback dismissed.',
      feedback,
      xpAwarded,
    });
  } catch (error) {
    console.error('[Review Flagged Feedback Error]', error);
    return res.status(500).json({ error: 'Failed to review flagged feedback.' });
  }
}
