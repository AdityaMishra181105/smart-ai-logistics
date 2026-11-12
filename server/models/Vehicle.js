const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      unique: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: ['TRUCK', 'VAN', 'PICKUP', 'MOTORCYCLE', 'OTHER'],
      default: 'TRUCK',
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity value is required'],
      min: [0.0001, 'Capacity must be greater than 0'],
    },
    capacityUnit: {
      type: String,
      required: [true, 'Capacity unit is required'],
      enum: ['KG', 'TON'],
      default: 'KG',
    },
    currentStatus: {
      type: String,
      required: [true, 'Vehicle status is required'],
      enum: ['AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'MAINTENANCE', 'INACTIVE'],
      default: 'AVAILABLE',
    },
    currentLocation: {
      locationName: {
        type: String,
        default: 'Guwahati Depot',
      },
      address: String,
      latitude: Number,
      longitude: Number,
    },
    assignedShipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
    },
    fuelType: {
      type: String,
      enum: ['DIESEL', 'PETROL', 'ELECTRIC', 'CNG', 'HYBRID'],
      default: 'DIESEL',
    },
    lastMaintenanceDate: {
      type: Date,
    },
    nextMaintenanceDate: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to generate sequential vehicleId
VehicleSchema.pre('validate', async function (next) {
  if (this.isNew && !this.vehicleId) {
    const currentYear = new Date().getFullYear();
    try {
      const count = await this.constructor.countDocuments({
        vehicleId: new RegExp(`^VEH-${currentYear}-`),
      });
      const nextNumber = String(count + 1).padStart(4, '0');
      this.vehicleId = `VEH-${currentYear}-${nextNumber}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
