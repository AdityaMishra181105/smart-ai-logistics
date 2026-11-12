const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const User = require('../models/User');
const { syncShipmentAlerts } = require('../services/alerts/autoAlertService');
const { notifyUser } = require('../services/notificationService');

// @desc    Create shipment
// @route   POST /api/shipments
// @access  Private (ADMIN)
exports.createShipment = async (req, res, next) => {
  try {
    const { goodsType, quantity, unit, pickup, destination, priority, vehicleNumber, notes, assignedDriver, driverId } = req.body;

    // Validate parameters
    if (!goodsType || !quantity || !unit || !pickup || !pickup.locationName || !destination || !destination.locationName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: goodsType, quantity, unit, pickup locationName, destination locationName',
      });
    }

    if (parseFloat(quantity) <= 0 || parseFloat(quantity) > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0 and less than or equal to 1,000,000',
      });
    }

    let targetDriverId = assignedDriver || driverId || null;
    if (targetDriverId) {
      const driverUser = await User.findById(targetDriverId);
      if (!driverUser) {
        return res.status(400).json({ success: false, message: 'Specified driver not found.' });
      }
      if (driverUser.role !== 'DRIVER') {
        return res.status(400).json({ success: false, message: 'Assigned user must have the DRIVER role.' });
      }
    }

    // Save to MongoDB
    const shipment = await Shipment.create({
      goodsType,
      quantity,
      unit,
      pickup,
      destination,
      priority,
      vehicleNumber,
      notes,
      assignedDriver: targetDriverId,
      requestedBy: req.user.id,
      status: 'ROUTE_PENDING',
    });

    const populatedShipment = await Shipment.findById(shipment._id)
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email role');

    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: 'SHIPMENT_CREATED',
        module: 'SHIPMENTS',
        referenceId: shipment.shipmentId,
        description: `Shipment ${shipment.shipmentId} created for ${shipment.goodsType} (${shipment.quantity} ${shipment.unit})`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[shipmentController] Audit error:', audErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: { shipment: populatedShipment },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// @desc    Get shipments list
// @route   GET /api/shipments
// @access  Private (Authenticated users)
exports.getShipments = async (req, res, next) => {
  try {
    const query = {};

    // Role-based data scoping
    if (req.user.role === 'DRIVER') {
      query.assignedDriver = req.user._id;
    } else if (req.user.role === 'NGO') {
      const ngoOrders = await Order.find({ createdBy: req.user._id }).select('_id assignedShipment');
      const orderIds = ngoOrders.map(o => o._id);
      const shipmentIdsFromOrders = ngoOrders.map(o => o.assignedShipment).filter(Boolean);
      query.$or = [
        { requestedBy: req.user._id },
        { assignedOrder: { $in: orderIds } },
        { _id: { $in: shipmentIdsFromOrders } }
      ];
    }

    // Apply filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    if (req.query.goodsType) {
      query.goodsType = req.query.goodsType;
    }

    // Apply Search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const searchOr = [
        { shipmentId: searchRegex },
        { 'pickup.locationName': searchRegex },
        { 'destination.locationName': searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const startIndex = (page - 1) * limit;

    const total = await Shipment.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const shipments = await Shipment.find(query)
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email role')
      .populate('assignedVehicle', 'registrationNumber vehicleType capacity capacityUnit currentStatus')
      .populate('assignedOrder')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        shipments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shipments assigned to logged-in driver
// @route   GET /api/shipments/my-assigned
// @access  Private (DRIVER, ADMIN)
exports.getMyAssignedShipments = async (req, res, next) => {
  try {
    const driverId = req.user.role === 'DRIVER' ? req.user._id : req.query.driverId || req.user._id;
    const shipments = await Shipment.find({ assignedDriver: driverId })
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email role')
      .populate('assignedVehicle', 'registrationNumber vehicleType capacity capacityUnit currentStatus')
      .populate('assignedOrder')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single shipment by ID
// @route   GET /api/shipments/:id
// @access  Private (Authenticated users)
exports.getShipmentById = async (req, res, next) => {
  try {
    const id = req.params.id;

    let shipment = await Shipment.findById(id)
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email role')
      .populate('assignedVehicle', 'registrationNumber vehicleType capacity capacityUnit currentStatus')
      .populate('assignedOrder');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    // Auto-heal / sync if vehicle is assigned to this shipment in Vehicle model but assignedVehicle reference on Shipment is missing
    if (!shipment.assignedVehicle) {
      const Vehicle = require('../models/Vehicle');
      const linkedVehicle = await Vehicle.findOne({ assignedShipment: shipment._id });
      if (linkedVehicle) {
        shipment.assignedVehicle = linkedVehicle._id;
        shipment.vehicleNumber = linkedVehicle.registrationNumber;
        await shipment.save();
      }
    }

    // Auto-heal / sync selectedRoute from Route collection in MongoDB if missing or empty coordinates
    if (!shipment.selectedRoute?.coordinates || shipment.selectedRoute.coordinates.length < 2) {
      const Route = require('../models/Route');
      const linkedRoute = await Route.findOne({
        $or: [
          ...(shipment.selectedRouteId ? [{ routeId: shipment.selectedRouteId }] : []),
          { shipments: shipment._id }
        ]
      });

      if (linkedRoute) {
        const coords = linkedRoute.selectedRouteData?.coordinates || linkedRoute.coordinates || [];
        if (coords && coords.length >= 2) {
          shipment.selectedRouteId = linkedRoute.routeId || shipment.selectedRouteId;
          shipment.selectedRoute = {
            routeId: linkedRoute.routeId || shipment.selectedRouteId || `RT-${shipment.shipmentId}`,
            name: linkedRoute.routeName || linkedRoute.selectedRouteData?.routeName || 'Confirmed Transit Route',
            distanceKm: linkedRoute.distance || linkedRoute.selectedRouteData?.distanceKm || 0,
            estimatedDurationMinutes: linkedRoute.estimatedDuration || linkedRoute.selectedRouteData?.durationMinutes || 0,
            riskLevel: linkedRoute.riskAnalysis?.level || linkedRoute.selectedRouteData?.riskLevel || 'LOW',
            riskScore: linkedRoute.riskAnalysis?.score || linkedRoute.selectedRouteData?.riskScore || 20,
            coordinates: coords,
            selectedAt: linkedRoute.selectedRouteData?.selectedAt || new Date()
          };
          if (shipment.status === 'CREATED' || shipment.status === 'ROUTE_PENDING') {
            shipment.status = 'ROUTE_SELECTED';
          }
          await shipment.save();
        }
      }
    }

    // Re-fetch populated shipment to reflect any auto-healed references
    shipment = await Shipment.findById(id)
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email role')
      .populate('assignedVehicle', 'registrationNumber vehicleType capacity capacityUnit currentStatus')
      .populate('assignedOrder');

    // Check DRIVER access restriction
    if (req.user.role === 'DRIVER' && (!shipment.assignedDriver || shipment.assignedDriver._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are only authorized to view shipments assigned to you.',
      });
    }

    // Check NGO access restriction: NGO can only access shipments created by NGO or linked to an Order created by NGO
    if (req.user.role === 'NGO') {
      const isOwner = shipment.requestedBy && shipment.requestedBy._id.toString() === req.user._id.toString();
      let isOrderOwner = false;
      if (!isOwner && shipment.assignedOrder) {
        const linkedOrder = await Order.findById(shipment.assignedOrder);
        if (linkedOrder && linkedOrder.createdBy && linkedOrder.createdBy.toString() === req.user._id.toString()) {
          isOrderOwner = true;
        }
      }
      if (!isOwner && !isOrderOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are only authorized to view shipments created by or assigned to your NGO.',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }
    next(error);
  }
};

// @desc    Update shipment status
// @route   PATCH /api/shipments/:id/status
// @access  Private (ADMIN, DRIVER)
exports.updateShipmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      'ROUTE_PENDING',
      'ROUTE_SELECTED',
      'IN_TRANSIT',
      'AT_RISK',
      'DELAYED',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Please specify a valid status: ${allowedStatuses.join(', ')}`,
      });
    }

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    if (req.user.role === 'DRIVER') {
      if (!shipment.assignedDriver || shipment.assignedDriver.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update shipments assigned to you.',
        });
      }
    }

    shipment.status = status;
    await shipment.save();

    const updatedShipment = await Shipment.findById(shipment._id)
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email role');

    await syncShipmentAlerts(updatedShipment, req.user.id);

    try {
      const { logAudit } = require('../services/auditService');
      const action = status === 'IN_TRANSIT' ? 'SHIPMENT_DISPATCHED' : status === 'DELIVERED' ? 'SHIPMENT_DELIVERED' : `SHIPMENT_${status}`;
      await logAudit({
        user: req.user,
        action,
        module: 'SHIPMENTS',
        referenceId: updatedShipment.shipmentId,
        description: `Shipment ${updatedShipment.shipmentId} status updated to ${status}`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[shipmentController] Audit status error:', audErr.message);
    }

    try {
      const { notifyUser, notifyRole } = require('../services/notificationService');
      const statusText = status.replace('_', ' ');

      if (req.user.role === 'DRIVER') {
        await notifyRole('ADMIN', {
          title: `Shipment ${statusText}`,
          message: `Driver ${req.user.name} updated shipment ${updatedShipment.shipmentId} status to ${statusText}.`,
          category: 'SHIPMENT',
          severity: ['AT_RISK', 'DELAYED'].includes(status) ? 'HIGH' : 'MEDIUM',
          relatedEntityType: 'Shipment',
          relatedEntityId: updatedShipment._id
        });
      }

      if (updatedShipment.requestedBy) {
        await notifyUser(updatedShipment.requestedBy._id || updatedShipment.requestedBy, {
          title: `Shipment ${statusText}`,
          message: `Your shipment ${updatedShipment.shipmentId} status is now ${statusText}.`,
          category: 'SHIPMENT',
          severity: ['AT_RISK', 'DELAYED'].includes(status) ? 'HIGH' : 'MEDIUM',
          relatedEntityType: 'Shipment',
          relatedEntityId: updatedShipment._id
        });
      }
    } catch (notifErr) {
      console.error('[shipmentController] Error sending status update notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Shipment status updated successfully',
      data: updatedShipment,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }
    next(error);
  }
};

// @desc    Update shipment details
// @route   PATCH /api/shipments/:id
// @access  Private (ADMIN)
exports.updateShipment = async (req, res, next) => {
  try {
    const { goodsType, quantity, unit, pickup, destination, priority, vehicleNumber, notes, assignedDriver, driverId } = req.body;

    const updates = {};
    if (goodsType) updates.goodsType = goodsType;
    if (quantity !== undefined) updates.quantity = parseFloat(quantity);
    if (unit) updates.unit = unit;
    if (priority) updates.priority = priority;
    if (vehicleNumber !== undefined) updates.vehicleNumber = vehicleNumber;
    if (notes !== undefined) updates.notes = notes;

    let targetDriverId = assignedDriver !== undefined ? assignedDriver : driverId;
    if (targetDriverId !== undefined) {
      if (targetDriverId === null || targetDriverId === '') {
        updates.assignedDriver = null;
      } else {
        const driverUser = await User.findById(targetDriverId);
        if (!driverUser) {
          return res.status(400).json({ success: false, message: 'Target driver user not found.' });
        }
        if (driverUser.role !== 'DRIVER') {
          return res.status(400).json({ success: false, message: 'Assigned user must have the DRIVER role.' });
        }
        updates.assignedDriver = driverUser._id;
      }
    }

    if (pickup) {
      if (pickup.locationName) updates['pickup.locationName'] = pickup.locationName;
      if (pickup.address !== undefined) updates['pickup.address'] = pickup.address;
      if (pickup.latitude !== undefined) updates['pickup.latitude'] = pickup.latitude;
      if (pickup.longitude !== undefined) updates['pickup.longitude'] = pickup.longitude;
    }
    if (destination) {
      if (destination.locationName) updates['destination.locationName'] = destination.locationName;
      if (destination.address !== undefined) updates['destination.address'] = destination.address;
      if (destination.latitude !== undefined) updates['destination.latitude'] = destination.latitude;
      if (destination.longitude !== undefined) updates['destination.longitude'] = destination.longitude;
    }

    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email role');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    await syncShipmentAlerts(shipment, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Shipment details updated successfully',
      data: shipment,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }
    next(error);
  }
};

// @desc    Delete shipment
// @route   DELETE /api/shipments/:id
// @access  Private (ADMIN)
exports.deleteShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shipment deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }
    next(error);
  }
};

// @desc    Create shipment directly from existing Order
// @route   POST /api/shipments/from-order/:orderId
// @access  Private (ADMIN)
exports.createShipmentFromOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { goodsType, quantity, unit, vehicleNumber, notes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Source order not found.',
      });
    }

    if (order.assignedShipment) {
      return res.status(400).json({
        success: false,
        message: 'A shipment has already been created for this order.',
      });
    }

    // Deduce or validate goodsType
    const validGoodsType = goodsType || 'FOOD';
    const validUnit = unit || 'KG';

    // Create shipment pre-filled from Order
    const shipment = await Shipment.create({
      goodsType: validGoodsType,
      quantity: quantity ? parseFloat(quantity) : order.quantity,
      unit: validUnit,
      pickup: {
        locationName: order.pickupLocation.locationName,
        address: order.pickupLocation.address || '',
        latitude: order.pickupLocation.latitude || 0,
        longitude: order.pickupLocation.longitude || 0,
      },
      destination: {
        locationName: order.deliveryLocation.locationName,
        address: order.deliveryLocation.address || '',
        latitude: order.deliveryLocation.latitude || 0,
        longitude: order.deliveryLocation.longitude || 0,
      },
      priority: order.priority || 'MEDIUM',
      vehicleNumber: vehicleNumber || '',
      notes: notes || order.cargoDescription,
      assignedOrder: order._id,
      requestedBy: req.user.id,
      status: 'ROUTE_PENDING',
    });

    // Link shipment to Order & update status
    order.assignedShipment = shipment._id;
    order.status = 'ASSIGNED';
    order.statusHistory.push({
      status: 'ASSIGNED',
      timestamp: new Date(),
      changedBy: req.user.id,
    });
    await order.save();

    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: 'SHIPMENT_CREATED',
        module: 'SHIPMENTS',
        referenceId: shipment.shipmentId,
        description: `Shipment ${shipment.shipmentId} created from Order ${order.orderId || order._id}`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[shipmentController] Audit error:', audErr.message);
    }

    try {
      if (order.createdBy) {
        const { notifyUser } = require('../services/notificationService');
        await notifyUser(order.createdBy, {
          title: 'Shipment Created',
          message: `Shipment ${shipment.shipmentId} has been created for your order ${order.orderId || order._id}.`,
          category: 'SHIPMENT',
          severity: 'MEDIUM',
          relatedEntityType: 'Shipment',
          relatedEntityId: shipment._id
        });
      }
    } catch (nErr) {
      console.error('[shipmentController] Error sending shipment created notification:', nErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Shipment created and linked to order successfully',
      data: {
        shipment,
        order,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Assign driver to shipment
// @route   PATCH /api/shipments/:id/assign-driver
// @access  Private (ADMIN)
exports.assignDriver = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    let driverUser = null;
    if (driverId) {
      driverUser = await User.findById(driverId);
      if (!driverUser) {
        return res.status(400).json({
          success: false,
          message: 'Target driver user not found.',
        });
      }
      shipment.assignedDriver = driverUser._id;
    } else {
      shipment.assignedDriver = null;
    }

    await shipment.save();

    const populatedShipment = await Shipment.findById(shipment._id)
      .populate('assignedDriver', 'name email role')
      .populate('requestedBy', 'name email');

    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: 'DRIVER_ASSIGNED',
        module: 'SHIPMENTS',
        referenceId: shipment.shipmentId,
        description: driverUser
          ? `Assigned driver ${driverUser.name} (${driverUser.email}) to Shipment ${shipment.shipmentId}`
          : `Unassigned driver from Shipment ${shipment.shipmentId}`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[shipmentController] Driver audit error:', audErr.message);
    }

    try {
      const { notifyUser } = require('../services/notificationService');
      if (driverUser) {
        await notifyUser(driverUser._id, {
          title: 'Shipment Assigned',
          message: `Shipment ${shipment.shipmentId} has been assigned to you.`,
          category: 'SHIPMENT',
          severity: 'MEDIUM',
          relatedEntityType: 'Shipment',
          relatedEntityId: shipment._id
        });
      }

      if (shipment.requestedBy) {
        const driverName = driverUser ? driverUser.name : 'A driver';
        await notifyUser(shipment.requestedBy._id || shipment.requestedBy, {
          title: 'Driver Assigned to Shipment',
          message: `${driverName} has been assigned to transport shipment ${shipment.shipmentId}.`,
          category: 'SHIPMENT',
          severity: 'LOW',
          relatedEntityType: 'Shipment',
          relatedEntityId: shipment._id
        });
      }
    } catch (nErr) {
      console.error('[shipmentController] Error sending driver assign notification:', nErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Driver assigned to shipment successfully',
      data: populatedShipment,
    });
  } catch (error) {
    next(error);
  }
};

