import { HelpSession } from '../models/HelpSession.js';
import { HelpRequest } from '../models/HelpRequest.js';
import { User } from '../models/User.js';
import { SessionFeedback } from '../models/SessionFeedback.js';
import { UserXPTransaction } from '../models/UserXPTransaction.js';
import { calculateSessionReward } from '../utils/points.js';
import { asTrimmedString, isValidObjectId, parseBoundedInt } from '../utils/sanitize.js';
import { createAndEmitNotification } from './notificationController.js';
import { emitToSession, emitToUser } from '../realtime/socket.js';
import { awardVerifiedXp, checkAndAwardFiveStudentsBonus } from '../services/xpService.js';
import { LearningActivity } from '../models/LearningActivity.js';
import { getDayKey, getUserStreakSummary, normalizeTimezone } from '../services/streakService.js';
import { evaluateLearningAchievements } from '../services/learningAchievementService.js';

function isSessionParticipant(session, userId) {
  const uid = String(userId);
  const reqId = String(session.requesterId?._id || session.requesterId);
  const helpId = String(session.helperId?._id || session.helperId);
  return uid === reqId || uid === helpId;
}

function getOtherParticipantId(session, userId) {
  const uid = String(userId);
  const reqId = String(session.requesterId?._id || session.requesterId);
  const helpId = String(session.helperId?._id || session.helperId);
  return uid === reqId ? helpId : reqId;
}

async function loadPopulatedSession(id) {
  return HelpSession.findById(id)
    .populate({
      path: 'requestId',
      populate: { path: 'skillId', select: 'name slug category' },
    })
    .populate('requesterId', 'fullName avatarUrl college branch academicYear')
    .populate('helperId', 'fullName avatarUrl college branch academicYear')
    .lean();
}

function emitSessionUpdateToParticipants(session, eventName = 'session:updated') {
  if (!session) return;
  const reqId = session.requesterId?._id || session.requesterId;
  const helpId = session.helperId?._id || session.helperId;
  emitToUser(reqId, eventName, { session });
  emitToUser(helpId, eventName, { session });
  emitToSession(session._id, eventName, { session });
}

export async function listMySessions(req, res) {
  try {
    const userId = req.user._id;
    const sessions = await HelpSession.find({
      $or: [{ requesterId: userId }, { helperId: userId }],
    })
      .populate({
        path: 'requestId',
        select: 'title description urgency bountyPoints status skillId createdAt',
        populate: { path: 'skillId', select: 'name slug category' },
      })
      .populate('requesterId', 'fullName avatarUrl college branch')
      .populate('helperId', 'fullName avatarUrl college branch')
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ sessions });
  } catch (error) {
    console.error('[List Sessions Error]', error);
    return res.status(500).json({ error: 'Failed to load your sessions.' });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID.' });
    }

    const session = await loadPopulatedSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (!isSessionParticipant(session, req.user._id)) {
      return res
        .status(403)
        .json({ error: 'Access denied. Only session participants can view this room.' });
    }

    const feedback = await SessionFeedback.findOne({ sessionId: id }).lean();

    return res.json({ session, feedback: feedback || null });
  } catch (error) {
    console.error('[Get Session Error]', error);
    return res.status(500).json({ error: 'Failed to load session details.' });
  }
}

export async function readySession(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID.' });
    }

    const existing = await HelpSession.findById(id).populate('requestId', 'title').lean();
    if (!existing) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    if (!isSessionParticipant(existing, req.user._id)) {
      return res.status(403).json({ error: 'Only session participants can update readiness.' });
    }
    if (existing.status === 'Completed' || existing.status === 'Cancelled') {
      return res.status(400).json({ error: `Cannot mark a ${existing.status.toLowerCase()} session ready.` });
    }

    const updated = await HelpSession.findOneAndUpdate(
      { _id: id, status: { $in: ['Accepted', 'Claimed'] } },
      { $set: { status: 'Ready to Join' } },
      { new: true }
    );

    if (updated) {
      await HelpRequest.findByIdAndUpdate(updated.requestId, {
        $set: { status: 'Ready to Join' },
      });

      const otherUserId = getOtherParticipantId(existing, req.user._id);
      const doubtTitle = existing.requestId?.title || 'your mentoring doubt';
      await createAndEmitNotification({
        recipientId: otherUserId,
        senderId: req.user._id,
        requestId: existing.requestId?._id || existing.requestId,
        sessionId: existing._id,
        type: 'session_ready',
        title: doubtTitle,
        message: `${req.user.fullName} is ready in the mentoring session for: ${doubtTitle}. Join the video call now.`,
      }).catch((err) => console.error('[Ready Notification Error]', err));
    }

    const populated = await loadPopulatedSession(id);
    emitSessionUpdateToParticipants(populated, 'session:updated');
    return res.json({ session: populated });
  } catch (error) {
    console.error('[Ready Session Error]', error);
    return res.status(500).json({ error: 'Failed to mark session ready.' });
  }
}

export async function startSession(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID.' });
    }

    const existing = await HelpSession.findById(id).populate('requestId', 'title');
    if (!existing) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    if (!isSessionParticipant(existing, req.user._id)) {
      return res.status(403).json({ error: 'Only session participants can start this session.' });
    }
    if (existing.status === 'Completed' || existing.status === 'Cancelled') {
      return res
        .status(400)
        .json({ error: `This session has already been ${existing.status.toLowerCase()}.` });
    }

    const isRequester = String(existing.requesterId) === String(req.user._id);
    const now = new Date();
    const updateSet = {
      status: 'In Progress',
      startedAt: existing.startedAt || now,
    };

    let isFirstJoinByCurrentUser = false;
    if (isRequester && !existing.requesterJoinedAt) {
      updateSet.requesterJoinedAt = now;
      isFirstJoinByCurrentUser = true;
    } else if (!isRequester && !existing.helperJoinedAt) {
      updateSet.helperJoinedAt = now;
      isFirstJoinByCurrentUser = true;
    }

    const transitionedToInProgress = existing.status !== 'In Progress';

    await HelpSession.findByIdAndUpdate(id, { $set: updateSet }, { new: true });

    await HelpRequest.findByIdAndUpdate(existing.requestId?._id || existing.requestId, {
      $set: { status: 'In Progress' },
    });

    const populated = await loadPopulatedSession(id);

    if (transitionedToInProgress || isFirstJoinByCurrentUser) {
      const otherUserId = getOtherParticipantId(existing, req.user._id);
      const otherHasJoined = isRequester
        ? Boolean(existing.helperJoinedAt)
        : Boolean(existing.requesterJoinedAt);

      if (!otherHasJoined) {
        const doubtTitle = existing.requestId?.title || 'your mentoring doubt';
        await createAndEmitNotification({
          recipientId: otherUserId,
          senderId: req.user._id,
          requestId: existing.requestId?._id || existing.requestId,
          sessionId: existing._id,
          type: 'session_started',
          title: doubtTitle,
          message: `${req.user.fullName} has started the video call for: ${doubtTitle}. Join the same room now.`,
        }).catch((err) => console.error('[Start Notification Error]', err));
      }
    }

    emitSessionUpdateToParticipants(populated, 'session:started');
    emitSessionUpdateToParticipants(populated, 'session:updated');

    return res.json({ session: populated });
  } catch (error) {
    console.error('[Start Session Error]', error);
    return res.status(500).json({ error: 'Failed to start mentoring session.' });
  }
}

export async function completeSession(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID.' });
    }

    const existing = await HelpSession.findById(id).populate('requestId').lean();
    if (!existing) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    if (!isSessionParticipant(existing, req.user._id)) {
      return res.status(403).json({ error: 'Only session participants can complete this session.' });
    }
    if (existing.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cancelled sessions cannot be completed.' });
    }
    if (existing.status === 'Completed' || existing.rewarded) {
      return res.status(400).json({ error: 'This session is already marked as completed.' });
    }
    if (String(existing.requesterId) === String(existing.helperId)) {
      return res.status(400).json({ error: 'Self-mentoring sessions cannot earn points.' });
    }

    const bountyPoints = existing.requestId?.bountyPoints || 0;
    const rewardPoints = calculateSessionReward(bountyPoints);
    const now = new Date();

    // Atomic completion & reward lock prevents duplicate point awards
    const completedSession = await HelpSession.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['Accepted', 'Claimed', 'Ready to Join', 'In Progress'] },
        rewarded: false,
      },
      {
        $set: {
          status: 'Completed',
          startedAt: existing.startedAt || now,
          completedAt: now,
          rewarded: true,
          pointsAwarded: rewardPoints,
        },
      },
      { new: true }
    );

    if (!completedSession) {
      return res.status(409).json({ error: 'Session was already completed or cancelled.' });
    }

    await Promise.all([
      HelpRequest.findByIdAndUpdate(existing.requestId._id, {
        $set: { status: 'Resolved' },
      }),
      User.findByIdAndUpdate(existing.helperId, {
        $inc: {
          contributionPoints: rewardPoints,
          completedSessions: 1,
        },
      }),
    ]);

    // Award verified Achievement XP (+20 XP base + 5-unique-students +30 XP milestone check)
    let xpEarned = 0;
    const doubtTitle = existing.requestId?.title || 'your mentoring doubt';
    const sessionXpResult = await awardVerifiedXp({
      userId: existing.helperId,
      ruleKey: 'session_completed',
      referenceKey: `session:${String(existing._id)}`,
      sourceType: 'session',
      sourceId: String(existing._id),
      actorId: existing.requesterId,
      description: `Verified mentoring session completed: ${doubtTitle}`,
    }).catch((err) => {
      console.error('[Session XP Award Error]', err);
      return { awarded: false };
    });

    if (sessionXpResult?.awarded) {
      xpEarned += sessionXpResult.xpAwarded || 0;
    }

    const milestoneResult = await checkAndAwardFiveStudentsBonus(existing.helperId).catch((err) => {
      console.error('[Five Students Bonus Error]', err);
      return { awarded: false };
    });

    if (milestoneResult?.awarded) {
      xpEarned += milestoneResult.xpAwarded || 0;
    }

    // Record verified mentoring contribution toward helper's learning streak & milestones
    try {
      const helperUser = await User.findById(existing.helperId).select('timezone').lean();
      const tz = normalizeTimezone(helperUser?.timezone || 'UTC');
      const dayKey = getDayKey(now, tz);
      const skillDoc = existing.requestId?.skillId
        ? await (await import('../models/Skill.js')).Skill.findById(existing.requestId.skillId).select('name').lean()
        : null;
      await LearningActivity.create({
        userId: existing.helperId,
        skillId: existing.requestId?.skillId || null,
        skillName: skillDoc?.name || 'Peer Mentoring',
        topic: `Mentored peer on: ${doubtTitle}`.slice(0, 160),
        durationMinutes: Math.min(120, Math.max(15, existing.duration || 15)),
        completed: true,
        note: 'Verified 15-minute QuickFix mentoring session',
        activityType: 'mentoring_helped',
        dayKey,
        timezone: tz,
        sourceRef: `session:${String(existing._id)}`,
      }).catch(() => {});
      const streakSummary = await getUserStreakSummary(existing.helperId, tz);
      await evaluateLearningAchievements(existing.helperId, streakSummary);
    } catch (streakErr) {
      console.error('[Session Streak Hook Error]', streakErr);
    }

    const otherUserId = getOtherParticipantId(existing, req.user._id);
    await createAndEmitNotification({
      recipientId: otherUserId,
      senderId: req.user._id,
      requestId: existing.requestId._id,
      sessionId: existing._id,
      type: 'session_completed',
      title: doubtTitle,
      message: `${req.user.fullName} marked the session for "${doubtTitle}" as completed (+${rewardPoints} pts awarded).`,
    }).catch((err) => console.error('[Complete Notification Error]', err));

    const populated = await loadPopulatedSession(id);
    emitSessionUpdateToParticipants(populated, 'session:completed');
    emitSessionUpdateToParticipants(populated, 'session:updated');

    return res.json({
      message: `Session completed! +${rewardPoints} contribution points${xpEarned > 0 ? ` and +${xpEarned} Achievement XP` : ''} awarded to helper.`,
      pointsAwarded: rewardPoints,
      xpAwarded: xpEarned,
      session: populated,
    });
  } catch (error) {
    console.error('[Complete Session Error]', error);
    return res.status(500).json({ error: 'Failed to complete session.' });
  }
}

export async function submitSessionFeedback(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID.' });
    }

    const existing = await HelpSession.findById(id).populate('requestId', 'title').lean();
    if (!existing) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    if (String(existing.requesterId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ error: 'Only the original doubt requester can submit session feedback.' });
    }
    if (String(existing.helperId) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot review yourself.' });
    }
    if (existing.status !== 'Completed' || !existing.rewarded) {
      return res
        .status(400)
        .json({ error: 'Feedback can only be submitted after a session is completed.' });
    }

    const existingFeedback = await SessionFeedback.findOne({ sessionId: id }).lean();
    if (existingFeedback) {
      return res.status(409).json({ error: 'Feedback has already been submitted for this session.' });
    }

    const rating = parseBoundedInt(req.body?.rating, 1, 5, 5);
    const helpful = req.body?.helpful !== false;
    const comment = asTrimmedString(req.body?.comment, 500);
    const isPositive = helpful && rating >= 4;

    // Anti-abuse detection: block repetitive feedback XP farming between the same pair within 24 hours
    let flagged = false;
    let flagReason = '';
    if (isPositive) {
      const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPairCount = await SessionFeedback.countDocuments({
        requesterId: req.user._id,
        helperId: existing.helperId,
        helpful: true,
        rating: { $gte: 4 },
        createdAt: { $gte: windowStart },
      });
      if (recentPairCount >= 3) {
        flagged = true;
        flagReason = 'Rapid positive feedback pattern between the same two students within 24 hours.';
      }
    }

    const feedback = await SessionFeedback.create({
      sessionId: existing._id,
      requesterId: req.user._id,
      helperId: existing.helperId,
      rating,
      helpful,
      comment,
      xpAwarded: false,
      flagged,
      flagReason,
    });

    let xpAwarded = 0;
    if (isPositive && !flagged) {
      const doubtTitle = existing.requestId?.title || 'mentoring session';
      const xpResult = await awardVerifiedXp({
        userId: existing.helperId,
        ruleKey: 'positive_feedback',
        referenceKey: `feedback:${String(existing._id)}`,
        sourceType: 'feedback',
        sourceId: String(existing._id),
        actorId: req.user._id,
        description: `Positive post-session feedback (${rating}/5) for: ${doubtTitle}`,
      });
      if (xpResult?.awarded) {
        xpAwarded = xpResult.xpAwarded;
        await SessionFeedback.updateOne({ _id: feedback._id }, { $set: { xpAwarded: true } });
        feedback.xpAwarded = true;
      }
    } else if (flagged) {
      await UserXPTransaction.create({
        userId: existing.helperId,
        ruleKey: 'positive_feedback',
        xpDelta: 0,
        balanceAfter: (await User.findById(existing.helperId).select('achievementXp').lean())?.achievementXp || 0,
        referenceKey: `feedback_flagged:${String(existing._id)}`,
        sourceType: 'feedback',
        sourceId: String(existing._id),
        actorId: req.user._id,
        description: `Flagged feedback review held for admin inspection`,
        status: 'flagged',
        suspiciousReason: flagReason,
      }).catch(() => {});
    }

    return res.status(201).json({
      message: flagged
        ? 'Feedback recorded and queued for moderation review.'
        : xpAwarded > 0
        ? `Thank you! Helper earned +${xpAwarded} Achievement XP for positive feedback.`
        : 'Thank you for submitting your session feedback.',
      feedback,
      xpAwarded,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Feedback has already been submitted for this session.' });
    }
    console.error('[Submit Feedback Error]', error);
    return res.status(500).json({ error: 'Failed to submit session feedback.' });
  }
}

export async function cancelSession(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid session ID.' });
    }

    const existing = await HelpSession.findById(id).populate('requestId', 'title').lean();
    if (!existing) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    if (!isSessionParticipant(existing, req.user._id)) {
      return res.status(403).json({ error: 'Only session participants can cancel this session.' });
    }
    if (existing.status === 'Completed' || existing.status === 'Cancelled') {
      return res
        .status(400)
        .json({ error: `Session is already ${existing.status.toLowerCase()}.` });
    }

    const now = new Date();
    const cancelled = await HelpSession.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['Pending Acceptance', 'Accepted', 'Claimed', 'Ready to Join', 'In Progress'] },
      },
      {
        $set: {
          status: 'Cancelled',
          cancelledAt: now,
          cancelledBy: req.user._id,
        },
      },
      { new: true }
    );

    if (!cancelled) {
      return res.status(409).json({ error: 'Session could not be cancelled because its status changed.' });
    }

    await HelpRequest.findByIdAndUpdate(existing.requestId?._id || existing.requestId, {
      $set: { status: 'Cancelled' },
    });

    const otherUserId = getOtherParticipantId(existing, req.user._id);
    const doubtTitle = existing.requestId?.title || 'your mentoring doubt';
    await createAndEmitNotification({
      recipientId: otherUserId,
      senderId: req.user._id,
      requestId: existing.requestId?._id || existing.requestId,
      sessionId: existing._id,
      type: 'session_cancelled',
      title: doubtTitle,
      message: `${req.user.fullName} cancelled the mentoring session for: ${doubtTitle}.`,
    }).catch((err) => console.error('[Cancel Notification Error]', err));

    const populated = await loadPopulatedSession(id);
    emitSessionUpdateToParticipants(populated, 'session:cancelled');
    emitSessionUpdateToParticipants(populated, 'session:updated');

    return res.json({
      message: 'Session cancelled.',
      session: populated,
    });
  } catch (error) {
    console.error('[Cancel Session Error]', error);
    return res.status(500).json({ error: 'Failed to cancel session.' });
  }
}
