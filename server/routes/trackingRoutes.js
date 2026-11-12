const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const { protect } = require('../middleware/authMiddleware');
const { calculateDistance } = require('../services/aiRouteService');

/**
 * Live Tracking API
 */

// @desc    Update live location telemetry for a shipment (Driver/GPS Device API)
// @route   POST /api/tracking/location
// @access  Private
router.post('/location', protect, async (req, res, next) => {
  try {
    const { shipmentId, latitude, longitude, speed, heading, accuracy } = req.body;

    if (!shipmentId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'shipmentId, latitude, and longitude are required.'
      });
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Driver authorization check: only assigned driver or admin can update location
    if (req.user.role === 'DRIVER') {
      if (!shipment.assignedDriver || shipment.assignedDriver.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update location for shipments assigned to you.'
        });
      }
    }

    shipment.liveLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: speed !== undefined && speed !== null && !isNaN(speed) ? parseFloat(speed) : null,
      heading: heading !== undefined && heading !== null ? parseFloat(heading) : 0,
      accuracy: accuracy !== undefined && accuracy !== null && !isNaN(accuracy) ? parseFloat(accuracy) : null,
      updatedAt: new Date()
    };

    let statusChangedToTransit = false;
    if (shipment.status === 'ROUTE_SELECTED') {
      shipment.status = 'IN_TRANSIT';
      statusChangedToTransit = true;
    }

    await shipment.save();

    // Emit Socket.IO real-time event to Admin live location tracking modal
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      if (io) {
        const payload = {
          shipmentId: shipment._id,
          shipmentRef: shipment.shipmentId,
          liveLocation: shipment.liveLocation,
          driverId: req.user._id,
          assignedVehicle: shipment.assignedVehicle
        };
        io.emit('vehicle:location:update', payload);
        io.emit('location:update', payload);
      }
    } catch (socErr) {
      console.warn('[trackingRoutes] Socket broadcast warning:', socErr.message);
    }

    if (statusChangedToTransit) {
      try {
        const { logAudit } = require('../services/auditService');
        await logAudit({
          user: req.user,
          action: 'SHIPMENT_DISPATCHED',
          module: 'SHIPMENTS',
          referenceId: shipment.shipmentId,
          description: `Shipment ${shipment.shipmentId} dispatched en route to ${shipment.destination?.locationName}`,
          status: 'SUCCESS'
        });
      } catch (audErr) {
        console.error('[trackingRoutes] Audit error:', audErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Live location updated successfully',
      data: {
        shipmentId: shipment._id,
        liveLocation: shipment.liveLocation
      }
    });

  } catch (err) {
    next(err);
  }
});

// @desc    Get live location and route tracking analysis for a shipment
// @route   GET /api/tracking/:shipmentId
// @access  Private
router.get('/:shipmentId', protect, async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.shipmentId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Role-based access check
    if (req.user.role === 'DRIVER' && (!shipment.assignedDriver || shipment.assignedDriver.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are only authorized to track shipments assigned to you.'
      });
    }

    if (req.user.role === 'NGO') {
      const isOwner = shipment.requestedBy && shipment.requestedBy.toString() === req.user._id.toString();
      let isOrderOwner = false;
      if (!isOwner && shipment.assignedOrder) {
        const Order = require('../models/Order');
        const linkedOrder = await Order.findById(shipment.assignedOrder);
        if (linkedOrder && linkedOrder.createdBy && linkedOrder.createdBy.toString() === req.user._id.toString()) {
          isOrderOwner = true;
        }
      }
      if (!isOwner && !isOrderOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are only authorized to track shipments created by or assigned to your NGO.'
        });
      }
    }

    const liveLoc = shipment.liveLocation;
    let distanceRemainingKm = null;
    let etaMinutes = null;
    let isOffRoute = false;

    if (liveLoc && liveLoc.latitude && shipment.destination?.latitude) {
      const distToDest = calculateDistance(
        { latitude: liveLoc.latitude, longitude: liveLoc.longitude },
        { latitude: shipment.destination.latitude, longitude: shipment.destination.longitude }
      );
      distanceRemainingKm = parseFloat(distToDest.toFixed(1));
      const currentSpeed = liveLoc.speed && liveLoc.speed > 0 ? liveLoc.speed : 40;
      etaMinutes = Math.round((distanceRemainingKm / currentSpeed) * 60);

      // Route Deviation Check
      if (shipment.selectedRoute?.coordinates && shipment.selectedRoute.coordinates.length > 0) {
        let minDistanceToRoute = Infinity;
        shipment.selectedRoute.coordinates.forEach(([rLat, rLon]) => {
          const d = calculateDistance(
            { latitude: liveLoc.latitude, longitude: liveLoc.longitude },
            { latitude: rLat, longitude: rLon }
          );
          if (d < minDistanceToRoute) minDistanceToRoute = d;
        });

        if (minDistanceToRoute > 5) {
          isOffRoute = true;
        }
      }
    }

    res.status(200).json({
      success: true,
      shipmentId: shipment._id,
      tracking: {
        liveLocation: liveLoc || null,
        status: shipment.status,
        distanceRemainingKm,
        etaMinutes,
        isOffRoute,
        selectedRoute: shipment.selectedRoute || null,
        pickup: shipment.pickup,
        destination: shipment.destination
      }
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
