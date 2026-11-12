const mongoose = require('mongoose');

const AlertHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  previousStatus: String,
  newStatus: String,
  previousSeverity: String,
  newSeverity: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  notes: String,
});

const AlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Alert description is required'],
      trim: true,
    },
    alertType: {
      type: String,
      required: true,
      enum: [
        'TRANSIT_DELAY',
        'CORRIDOR_HAZARD',
        'WEATHER_WARNING',
        'VEHICLE_ISSUE',
        'SHIPMENT_RISK',
        'SYSTEM_ALERT',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'],
      default: 'ACTIVE',
    },
    relatedShipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    relatedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    relatedRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      region: String,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    acknowledgedAt: Date,
    resolvedAt: Date,
    resolutionNotes: String,
    history: [AlertHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
AlertSchema.index({ status: 1 });
AlertSchema.index({ severity: 1 });
AlertSchema.index({ alertType: 1 });
AlertSchema.index({ relatedShipment: 1 });
AlertSchema.index({ relatedOrder: 1 });
AlertSchema.index({ relatedVehicle: 1 });
AlertSchema.index({ relatedRoute: 1 });
AlertSchema.index({ createdAt: -1 });

// Pre-validate hook to generate sequential ID: ALT-YYYY-XXXX
AlertSchema.pre('validate', async function (next) {
  if (this.isNew && !this.alertId) {
    const currentYear = new Date().getFullYear();
    try {
      // Look up highest existing index in this year
      const count = await this.constructor.countDocuments({
        alertId: new RegExp(`^ALT-${currentYear}-`),
      });
      const nextNumber = String(count + 1).padStart(4, '0');
      this.alertId = `ALT-${currentYear}-${nextNumber}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Alert', AlertSchema);
