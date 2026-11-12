const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      unique: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'SHIPMENT',
        'ORDER',
        'VEHICLE',
        'DRIVER',
        'ROUTE',
        'WAREHOUSE',
        'ALERT',
        'SYSTEM',
        'REPORT',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    relatedEntityType: {
      type: String,
      enum: ['Shipment', 'Order', 'Vehicle', 'Driver', 'Route', 'Warehouse', 'Alert'],
      default: null,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying
NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ category: 1 });
NotificationSchema.index({ createdAt: -1 });

// Pre-validate hook to generate sequential identifier: NTF-YYYY-XXXX
NotificationSchema.pre('validate', async function (next) {
  if (this.isNew && !this.notificationId) {
    const currentYear = new Date().getFullYear();
    try {
      const latest = await this.constructor.findOne({
        notificationId: new RegExp(`^NTF-${currentYear}-`),
      })
        .sort({ notificationId: -1 })
        .select('notificationId');

      let nextIndex = 1;
      if (latest && latest.notificationId) {
        const parts = latest.notificationId.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextIndex = lastNum + 1;
        }
      }
      
      // Secondary check: verify if this ID already exists in DB to be 100% duplicate-proof
      let isDuplicate = true;
      let finalId = '';
      while (isDuplicate) {
        const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        finalId = `NTF-${currentYear}-${String(nextIndex).padStart(4, '0')}-${randSuffix}`;
        const existing = await this.constructor.findOne({ notificationId: finalId }).select('_id');
        if (!existing) {
          isDuplicate = false;
        } else {
          nextIndex++;
        }
      }
      
      this.notificationId = finalId;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);
