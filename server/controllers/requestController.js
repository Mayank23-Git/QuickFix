import crypto from 'crypto';
import { HelpRequest } from '../models/HelpRequest.js';
import { HelpSession } from '../models/HelpSession.js';
import { Skill } from '../models/Skill.js';
import { findMatchedHelpersForRequest } from '../services/matchingService.js';
import { createAndEmitNotification } from './notificationController.js';
import { emitToUser } from '../realtime/socket.js';
import {
  asTrimmedString,
  escapeRegex,
  isValidObjectId,
  parseBoundedInt,
} from '../utils/sanitize.js';
import { MAX_BOUNTY_POINTS, SESSION_DURATION_MINUTES } from '../utils/points.js';

export async function listRequests(req, res) {
  try {
    const search = asTrimmedString(req.query?.search, 100);
    const skillId = asTrimmedString(req.query?.skillId, 40);
    const urgency = asTrimmedString(req.query?.urgency, 20);
    const status = asTrimmedString(req.query?.status, 20);
    const authorId = asTrimmedString(req.query?.authorId, 40);

    const query = {};
    if (skillId && isValidObjectId(skillId)) {
      query.skillId = skillId;
    }
    if (['Low', 'Medium', 'High'].includes(urgency)) {
      query.urgency = urgency;
    }
    if (status === 'Open' || status === 'Pending Acceptance') {
      query.status = { $in: ['Open', 'Pending Acceptance'] };
    } else if (status === 'Accepted' || status === 'Claimed') {
      query.status = { $in: ['Accepted', 'Claimed'] };
    } else if (status === 'Resolved' || status === 'Completed') {
      query.status = { $in: ['Resolved', 'Completed'] };
    } else if (['Ready to Join', 'In Progress', 'Cancelled'].includes(status)) {
      query.status = status;
    }
    if (authorId && isValidObjectId(authorId)) {
      query.authorId = authorId;
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ title: rx }, { description: rx }];
    }

    const requests = await HelpRequest.find(query)
      .populate('authorId', 'fullName avatarUrl college branch academicYear isDemo')
      .populate('skillId', 'name slug category')
      .populate('helperId', 'fullName avatarUrl college')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    return res.json({ requests });
  } catch (error) {
    console.error('[List Requests Error]', error);
    return res.status(500).json({ error: 'Failed to load doubt board.' });
  }
}

export async function getRequestById(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid doubt ID.' });
    }

    const request = await HelpRequest.findById(id)
      .populate('authorId', 'fullName avatarUrl college branch academicYear contributionPoints completedSessions isDemo')
      .populate('skillId', 'name slug category relatedSlugs')
      .populate('helperId', 'fullName avatarUrl college branch contributionPoints completedSessions')
      .lean();

    if (!request) {
      return res.status(404).json({ error: 'Doubt not found.' });
    }

    const [matchedHelpers, sessionDoc] = await Promise.all([
      findMatchedHelpersForRequest(
        {
          _id: request._id,
          skillId: request.skillId?._id || request.skillId,
          authorId: request.authorId?._id || request.authorId,
        },
        6
      ),
      HelpSession.findOne({ requestId: request._id })
        .select('_id status requesterId helperId roomName startedAt completedAt duration rewarded pointsAwarded')
        .lean(),
    ]);

    const viewerId = req.user ? String(req.user._id) : null;
    const isParticipant =
      sessionDoc &&
      viewerId &&
      (String(sessionDoc.requesterId) === viewerId || String(sessionDoc.helperId) === viewerId);

    const safeSession = sessionDoc
      ? isParticipant
        ? sessionDoc
        : {
            _id: sessionDoc._id,
            status: sessionDoc.status,
          }
      : null;

    return res.json({
      request,
      matchedHelpers,
      session: safeSession,
    });
  } catch (error) {
    console.error('[Get Request Error]', error);
    return res.status(500).json({ error: 'Failed to load doubt details.' });
  }
}

export async function createRequest(req, res) {
  try {
    const title = asTrimmedString(req.body?.title, 140);
    const description = asTrimmedString(req.body?.description, 3000);
    const skillId = asTrimmedString(req.body?.skillId, 40);
    const urgency = asTrimmedString(req.body?.urgency, 20) || 'Medium';
    const bountyPoints = parseBoundedInt(req.body?.bountyPoints, 0, MAX_BOUNTY_POINTS, 0);

    if (title.length < 6) {
      return res.status(400).json({ error: 'Title must be at least 6 characters.' });
    }
    if (description.length < 15) {
      return res.status(400).json({ error: 'Please include at least 15 characters describing your doubt.' });
    }
    if (!isValidObjectId(skillId)) {
      return res.status(400).json({ error: 'Please choose a valid skill category.' });
    }
    if (!['Low', 'Medium', 'High'].includes(urgency)) {
      return res.status(400).json({ error: 'Urgency must be Low, Medium, or High.' });
    }

    const skill = await Skill.findById(skillId).lean();
    if (!skill) {
      return res.status(404).json({ error: 'Selected skill does not exist.' });
    }

    const created = await HelpRequest.create({
      authorId: req.user._id,
      title,
      description,
      skillId,
      urgency,
      bountyPoints,
      status: 'Open',
      helperId: null,
      isDemo: false,
    });

    const populated = await HelpRequest.findById(created._id)
      .populate('authorId', 'fullName avatarUrl college branch academicYear')
      .populate('skillId', 'name slug category')
      .lean();

    return res.status(201).json({ request: populated });
  } catch (error) {
    console.error('[Create Request Error]', error);
    return res.status(500).json({ error: 'Failed to post doubt.' });
  }
}

export async function updateRequest(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid doubt ID.' });
    }

    const existing = await HelpRequest.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Doubt not found.' });
    }
    if (String(existing.authorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the doubt author can edit this request.' });
    }
    if (!['Open', 'Pending Acceptance'].includes(existing.status)) {
      return res.status(400).json({ error: 'Claimed, completed, or cancelled doubts cannot be edited.' });
    }

    const title = req.body?.title !== undefined ? asTrimmedString(req.body.title, 140) : existing.title;
    const description =
      req.body?.description !== undefined ? asTrimmedString(req.body.description, 3000) : existing.description;
    const skillId = req.body?.skillId !== undefined ? asTrimmedString(req.body.skillId, 40) : String(existing.skillId);
    const urgency = req.body?.urgency !== undefined ? asTrimmedString(req.body.urgency, 20) : existing.urgency;
    const bountyPoints =
      req.body?.bountyPoints !== undefined
        ? parseBoundedInt(req.body.bountyPoints, 0, MAX_BOUNTY_POINTS, existing.bountyPoints)
        : existing.bountyPoints;

    if (title.length < 6) {
      return res.status(400).json({ error: 'Title must be at least 6 characters.' });
    }
    if (description.length < 15) {
      return res.status(400).json({ error: 'Description must be at least 15 characters.' });
    }
    if (!isValidObjectId(skillId)) {
      return res.status(400).json({ error: 'Invalid skill selected.' });
    }
    if (!['Low', 'Medium', 'High'].includes(urgency)) {
      return res.status(400).json({ error: 'Invalid urgency level.' });
    }

    existing.title = title;
    existing.description = description;
    existing.skillId = skillId;
    existing.urgency = urgency;
    existing.bountyPoints = bountyPoints;
    await existing.save();

    const populated = await HelpRequest.findById(existing._id)
      .populate('authorId', 'fullName avatarUrl college branch academicYear')
      .populate('skillId', 'name slug category')
      .lean();

    return res.json({ request: populated });
  } catch (error) {
    console.error('[Update Request Error]', error);
    return res.status(500).json({ error: 'Failed to update doubt.' });
  }
}

export async function deleteRequest(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid doubt ID.' });
    }

    const existing = await HelpRequest.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ error: 'Doubt not found.' });
    }
    if (String(existing.authorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the author can delete this doubt.' });
    }
    if (!['Open', 'Pending Acceptance'].includes(existing.status) || existing.helperId) {
      return res.status(400).json({ error: 'Only unclaimed open doubts can be deleted.' });
    }

    const deleted = await HelpRequest.findOneAndDelete({
      _id: id,
      authorId: req.user._id,
      status: { $in: ['Open', 'Pending Acceptance'] },
      helperId: null,
    });

    if (!deleted) {
      return res.status(409).json({ error: 'This doubt was already claimed and cannot be deleted.' });
    }

    return res.json({ message: 'Doubt deleted successfully.' });
  } catch (error) {
    console.error('[Delete Request Error]', error);
    return res.status(500).json({ error: 'Failed to delete doubt.' });
  }
}

export async function claimRequest(req, res) {
  let claimedRequest = null;
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid doubt ID.' });
    }

    const existing = await HelpRequest.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ error: 'Help request not found.' });
    }
    if (String(existing.authorId) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot claim your own help request.' });
    }
    if (!['Open', 'Pending Acceptance'].includes(existing.status) || existing.helperId) {
      return res.status(409).json({ error: 'This doubt has already been claimed by another student.' });
    }

    // Atomic conditional update prevents race conditions between simultaneous claims
    claimedRequest = await HelpRequest.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['Open', 'Pending Acceptance'] },
        helperId: null,
        authorId: { $ne: req.user._id },
      },
      {
        $set: {
          status: 'Accepted',
          helperId: req.user._id,
        },
      },
      { new: true }
    );

    if (!claimedRequest) {
      return res.status(409).json({ error: 'This doubt was just claimed by another student.' });
    }

    const uniqueSuffix = crypto.randomBytes(5).toString('hex');
    const roomName = `QuickFix-${String(claimedRequest._id).slice(-6)}-${uniqueSuffix}`;

    const session = await HelpSession.create({
      requestId: claimedRequest._id,
      requesterId: claimedRequest.authorId,
      helperId: req.user._id,
      roomName,
      status: 'Accepted',
      duration: SESSION_DURATION_MINUTES,
      rewarded: false,
      pointsAwarded: 0,
    });

    const populatedSession = await HelpSession.findById(session._id)
      .populate({
        path: 'requestId',
        populate: { path: 'skillId', select: 'name slug' },
      })
      .populate('requesterId', 'fullName avatarUrl college branch')
      .populate('helperId', 'fullName avatarUrl college branch')
      .lean();

    // Persist notification in MongoDB and push real-time update to the original requester
    await createAndEmitNotification({
      recipientId: claimedRequest.authorId,
      senderId: req.user._id,
      requestId: claimedRequest._id,
      sessionId: session._id,
      type: 'session_accepted',
      title: claimedRequest.title,
      message: `${req.user.fullName} has accepted your doubt request: ${claimedRequest.title}. Your mentoring session is ready.`,
    }).catch((notifyErr) => {
      console.error('[Claim Notification Error]', notifyErr);
    });

    emitToUser(claimedRequest.authorId, 'session:updated', { session: populatedSession });
    emitToUser(req.user._id, 'session:updated', { session: populatedSession });

    return res.status(201).json({
      message: 'Doubt accepted! Your shared 15-minute mentoring room is ready.',
      session: populatedSession,
    });
  } catch (error) {
    // Explicit rollback if HelpSession creation fails after HelpRequest was atomically claimed
    if (claimedRequest) {
      await HelpRequest.findOneAndUpdate(
        { _id: claimedRequest._id, helperId: req.user._id, status: { $in: ['Accepted', 'Claimed'] } },
        { $set: { status: 'Open', helperId: null } }
      ).catch(() => {});
    }
    console.error('[Claim Request Error]', error);
    return res.status(500).json({ error: 'Could not claim this doubt. Please try again.' });
  }
}
