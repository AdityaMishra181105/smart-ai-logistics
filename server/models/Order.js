const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    contactInfo: {
      type: String,
      trim: true,
    },
    pickupLocation: {
      locationName: {
        type: String,
        required: [true, 'Pickup location name is required'],
      },
      address: String,
      latitude: Number,
      longitude: Number,
    },
    deliveryLocation: {
      locationName: {
        type: String,
        required: [true, 'Delivery location name is required'],
      },
      address: String,
      latitude: Number,
      longitude: Number,
    },
    cargoDescription: {
      type: String,
      required: [true, 'Cargo description is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.0001, 'Quantity must be greater than 0'],
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0.0001, 'Weight must be greater than 0'],
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'ASSIGNED',
        'IN_TRANSIT',
        'DELIVERED',
        'CANCELLED'
      ],
      default: 'PENDING',
    },
    requestedDeliveryDate: {
      type: Date,
      required: [true, 'Requested delivery date is required'],
    },
    assignedShipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to generate sequential orderId
OrderSchema.pre('validate', async function (next) {
  if (this.isNew && !this.orderId) {
    const currentYear = new Date().getFullYear();
    try {
      const latest = await this.constructor.findOne({
        orderId: new RegExp(`^ORD-${currentYear}-`),
      })
        .sort({ orderId: -1 })
        .select('orderId');

      let nextIndex = 1;
      if (latest && latest.orderId) {
        const parts = latest.orderId.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextIndex = lastNum + 1;
        }
      }

      let isDuplicate = true;
      let finalId = '';
      while (isDuplicate) {
        finalId = `ORD-${currentYear}-${String(nextIndex).padStart(4, '0')}`;
        const existing = await this.constructor.findOne({ orderId: finalId }).select('_id');
        if (!existing) {
          isDuplicate = false;
        } else {
          nextIndex++;
        }
      }
      this.orderId = finalId;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Pre-save hook to initialize statusHistory if empty
OrderSchema.pre('save', function (next) {
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [
      {
        status: this.status,
        timestamp: new Date(),
        changedBy: this.createdBy,
      },
    ];
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
