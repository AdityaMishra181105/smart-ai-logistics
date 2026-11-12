const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,
    trim: true,
  },
  address: String,
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
});

const StatusHistorySchema = new mongoose.Schema({
  previousStatus: {
    type: String,
  },
  newStatus: {
    type: String,
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const RouteSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      unique: true,
    },
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
    origin: {
      type: LocationSchema,
      required: [true, 'Origin location is required'],
    },
    destination: {
      type: LocationSchema,
      required: [true, 'Destination location is required'],
    },
    waypoints: [LocationSchema],
    distance: {
      type: Number,
      required: [true, 'Route distance is required'],
      min: [0, 'Distance cannot be negative'],
    },
    estimatedDuration: {
      type: Number,
      required: [true, 'Estimated duration is required'],
      min: [0, 'Duration cannot be negative'],
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    shipments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment',
      },
    ],
    routeStatus: {
      type: String,
      required: [true, 'Route status is required'],
      enum: ['PLANNED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNED',
    },
    statusHistory: [StatusHistorySchema],
    // AI Route Intelligence fields
    selectedRouteData: {
      routeId: String,
      routeName: String,
      coordinates: [[Number]], // Array of [lat, lon] pairs
      distanceKm: Number,
      durationMinutes: Number,
      riskLevel: String,
      riskScore: Number,
      selectedAt: Date,
    },
    riskAnalysis: {
      level: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'],
      },
      score: Number,
      factors: [
        {
          factor: String,
          severity: String,
          impact: String,
          location: String,
        },
      ],
      aiRecommendation: String,
      analyzedAt: Date,
    },
    alternatives: [
      {
        routeId: String,
        routeName: String,
        distanceKm: Number,
        durationMinutes: Number,
        riskLevel: String,
        riskScore: Number,
        isRecommended: Boolean,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to generate sequential routeId
RouteSchema.pre('validate', async function (next) {
  if (this.isNew && !this.routeId) {
    const currentYear = new Date().getFullYear();
    try {
      const count = await this.constructor.countDocuments({
        routeId: new RegExp(`^RTE-${currentYear}-`),
      });
      const nextNumber = String(count + 1).padStart(4, '0');
      this.routeId = `RTE-${currentYear}-${nextNumber}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Route', RouteSchema);
