const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      unique: true,
    },
    goodsType: {
      type: String,
      required: [true, 'Please specify goods type'],
      enum: ['MEDICINE', 'FOOD', 'CONSTRUCTION_MATERIAL', 'AGRICULTURAL_PRODUCE'],
    },
    quantity: {
      type: Number,
      required: [true, 'Please specify quantity'],
      min: [0.0001, 'Quantity must be greater than 0'],
      max: [1000000, 'Quantity cannot exceed 1,000,000'],
    },
    unit: {
      type: String,
      required: [true, 'Please specify unit'],
      enum: ['KG', 'TON', 'BOX', 'PACKET', 'LITRE', 'UNIT'],
    },
    pickup: {
      locationName: {
        type: String,
        required: [true, 'Pickup location name is required'],
      },
      address: String,
      latitude: Number,
      longitude: Number,
    },
    destination: {
      locationName: {
        type: String,
        required: [true, 'Destination location name is required'],
      },
      address: String,
      latitude: Number,
      longitude: Number,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: [
        'CREATED',
        'ROUTE_PENDING',
        'ROUTE_SELECTED',
        'IN_TRANSIT',
        'AT_RISK',
        'DELAYED',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'CREATED',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      maxlength: [30, 'Vehicle number cannot exceed 30 characters'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    selectedRouteId: {
      type: String,
    },
    selectedRoute: {
      routeId: String,
      name: String,
      type: {
        type: String,
        enum: ['FASTEST', 'SAFEST', 'BALANCED'],
      },
      distanceKm: Number,
      estimatedDurationMinutes: Number,
      roadCondition: {
        type: String,
        enum: ['GOOD', 'MODERATE', 'POOR', 'MOUNTAIN'],
      },
      safetyScore: Number,
      riskScore: Number,
      riskLevel: String,
      riskFactors: mongoose.Schema.Types.Mixed,
      weatherRisk: mongoose.Schema.Types.Mixed,
      hazardAnalysis: mongoose.Schema.Types.Mixed,
      coordinates: [[Number]],
      selectedAt: Date,
      selectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    liveLocation: {
      latitude: Number,
      longitude: Number,
      speed: Number,
      heading: Number,
      updatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to generate sequential shipmentId
ShipmentSchema.pre('validate', async function (next) {
  if (this.isNew && !this.shipmentId) {
    const currentYear = new Date().getFullYear();
    try {
      // Look up highest existing index in this year
      const count = await this.constructor.countDocuments({
        shipmentId: new RegExp(`^SHP-${currentYear}-`),
      });
      const nextNumber = String(count + 1).padStart(4, '0');
      this.shipmentId = `SHP-${currentYear}-${nextNumber}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Pre-save hook to transition CREATED shipments to ROUTE_PENDING
ShipmentSchema.pre('save', function (next) {
  if (this.isNew && this.status === 'CREATED') {
    this.status = 'ROUTE_PENDING';
  }
  next();
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
