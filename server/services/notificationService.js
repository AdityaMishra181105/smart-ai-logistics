const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Creates a notification safely. Logs database errors instead of throwing to prevent crashing core logic.
 */
const createNotification = async (notificationData) => {
  try {
    const { recipient, title, message, category, severity, relatedEntityType, relatedEntityId } = notificationData;

    // Validate recipient ID
    if (!recipient || !mongoose.Types.ObjectId.isValid(recipient)) {
      console.warn(`[NotificationService] Invalid recipient ID skipped: ${recipient}`);
      return null;
    }

    // Anti-spam: prevent duplicate notifications within a 5-second window
    const recentDuplicate = await Notification.findOne({
      recipient,
      title,
      message,
      createdAt: { $gte: new Date(Date.now() - 5000) }
    });

    if (recentDuplicate) {
      return recentDuplicate;
    }

    const notification = await Notification.create({
      recipient,
      title,
      message,
      category,
      severity: severity || 'MEDIUM',
      relatedEntityType: relatedEntityType || null,
      relatedEntityId: relatedEntityId || null
    });

    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      if (io) {
        io.emit('notification:new', notification);
      }
    } catch (sErr) {
      // Socket not initialized yet or inactive
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Database error during notification creation:', error);
    return null;
  }
};

/**
 * Dispatch a notification to a specific user.
 */
const notifyUser = async (userId, data) => {
  if (!userId) return null;
  return await createNotification({
    recipient: userId,
    ...data
  });
};

/**
 * Broadcast a notification to all users holding a specific authorization role.
 */
const notifyRole = async (role, data) => {
  try {
    const users = await User.find({ role }).select('_id');
    const promises = users.map(user => 
      createNotification({
        recipient: user._id,
        ...data
      })
    );
    return await Promise.all(promises);
  } catch (error) {
    console.error(`[NotificationService] Failed to notify role ${role}:`, error);
    return [];
  }
};

/**
 * Mark a single notification as read, ensuring recipient ownership.
 */
const markNotificationRead = async (notificationId, userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      const err = new Error('Invalid notification ID format');
      err.statusCode = 400;
      throw err;
    }

    const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
    if (!notification) {
      const err = new Error('Notification not found or unauthorized access');
      err.statusCode = 404;
      throw err;
    }

    notification.isRead = true;
    await notification.save();
    return notification;
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
};

/**
 * Mark all notifications for a specific user as read.
 */
const markAllNotificationsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );
    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Failed to mark all notifications read:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  notifyUser,
  notifyRole,
  markNotificationRead,
  markAllNotificationsRead
};
