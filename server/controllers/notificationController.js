import { Notification } from '../models/Notification.js';
import { emitToUser } from '../realtime/socket.js';
import { isValidObjectId } from '../utils/sanitize.js';

export async function createAndEmitNotification({
  recipientId,
  senderId,
  requestId,
  sessionId,
  type,
  title,
  message,
}) {
  if (!recipientId || !senderId || String(recipientId) === String(senderId)) {
    return null;
  }

  const created = await Notification.create({
    recipientId,
    senderId,
    requestId,
    sessionId,
    type,
    title,
    message,
    read: false,
  });

  const populated = await Notification.findById(created._id)
    .populate('senderId', 'fullName avatarUrl college branch')
    .populate({
      path: 'requestId',
      select: 'title urgency bountyPoints status skillId',
      populate: { path: 'skillId', select: 'name slug' },
    })
    .populate('sessionId', '_id status roomName startedAt requesterJoinedAt helperJoinedAt')
    .lean();

  emitToUser(recipientId, 'notification:new', {
    notification: populated,
  });

  return populated;
}

export async function listMyNotifications(req, res) {
  try {
    const userId = req.user._id;
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientId: userId })
        .populate('senderId', 'fullName avatarUrl college branch')
        .populate({
          path: 'requestId',
          select: 'title urgency bountyPoints status skillId',
          populate: { path: 'skillId', select: 'name slug' },
        })
        .populate('sessionId', '_id status roomName startedAt requesterJoinedAt helperJoinedAt')
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      Notification.countDocuments({ recipientId: userId, read: false }),
    ]);

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[List Notifications Error]', error);
    return res.status(500).json({ error: 'Failed to load notifications.' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid notification ID.' });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipientId: req.user._id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    )
      .populate('senderId', 'fullName avatarUrl college branch')
      .populate({
        path: 'requestId',
        select: 'title urgency bountyPoints status skillId',
        populate: { path: 'skillId', select: 'name slug' },
      })
      .populate('sessionId', '_id status roomName startedAt requesterJoinedAt helperJoinedAt')
      .lean();

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      read: false,
    });

    return res.json({ notification: updated, unreadCount });
  } catch (error) {
    console.error('[Mark Notification Read Error]', error);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.json({ updated: true, unreadCount: 0 });
  } catch (error) {
    console.error('[Mark All Notifications Read Error]', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
}
