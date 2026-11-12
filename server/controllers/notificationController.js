const Notification = require('../models/Notification');
const { markNotificationRead, markAllNotificationsRead } = require('../services/notificationService');
const mongoose = require('mongoose');

// @desc    Get user notifications listing
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const query = { recipient: req.user.id };

    // Apply Filters
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }
    if (req.query.category) {
      query.category = req.query.category.toUpperCase();
    }
    if (req.query.severity) {
      query.severity = req.query.severity.toUpperCase();
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const startIndex = (page - 1) * limit;

    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get count of unread notifications
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markRead = async (req, res, next) => {
  try {
    const notification = await markNotificationRead(req.params.id, req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
exports.markAllRead = async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Dismiss a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format'
      });
    }

    const notification = await Notification.findOne({ _id: id, recipient: req.user.id });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access unauthorized'
      });
    }

    await Notification.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: 'Notification dismissed successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
