const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const User = require('../models/User');

// Helper to build role-based MongoDB query for alert visibility
const getAlertQueryForUser = async (user) => {
  if (!user || user.role === 'ADMIN') {
    return {}; // Admin sees all system alerts
  }

  if (user.role === 'NGO') {
    // 1. Find all orders created by this NGO
    const ngoOrders = await Order.find({ createdBy: user._id }).select('_id assignedShipment');
    const ngoOrderIds = ngoOrders.map((o) => o._id);
    const ngoAssignedShipmentsFromOrders = ngoOrders.map((o) => o.assignedShipment).filter(Boolean);

    // 2. Find all shipments linked to these orders or requested by this NGO
    const ngoShipments = await Shipment.find({
      $or: [
        { assignedOrder: { $in: ngoOrderIds } },
        { requestedBy: user._id },
        { _id: { $in: ngoAssignedShipmentsFromOrders } },
      ],
    }).select('_id selectedRoute');

    const ngoShipmentIds = ngoShipments.map((s) => s._id);

    // Collect any route references on those shipments
    const ngoRouteIds = [];
    ngoShipments.forEach((s) => {
      if (s.selectedRoute && s.selectedRoute._id) {
        ngoRouteIds.push(s.selectedRoute._id);
      }
    });

    const ngoOrConditions = [
      { relatedOrder: { $in: ngoOrderIds } },
      { relatedShipment: { $in: ngoShipmentIds } },
      { reportedBy: user._id },
      { assignedTo: user._id },
    ];
    if (ngoRouteIds.length > 0) {
      ngoOrConditions.push({ relatedRoute: { $in: ngoRouteIds } });
    }

    return { $or: ngoOrConditions };
  }

  if (user.role === 'DRIVER') {
    const driverShipments = await Shipment.find({ assignedDriver: user._id }).select('_id assignedVehicle selectedRouteId');
    const driverShipmentIds = driverShipments.map((s) => s._id);

    const driverVehicles = await Vehicle.find({
      $or: [
        { assignedDriver: user._id },
        { assignedShipment: { $in: driverShipmentIds } }
      ]
    }).select('_id');
    const driverVehicleIds = driverVehicles.map(v => v._id);

    const driverRoutes = await Route.find({ shipments: { $in: driverShipmentIds } }).select('_id');
    const driverRouteIds = driverRoutes.map(r => r._id);

    const driverOrConditions = [
      { relatedShipment: { $in: driverShipmentIds } },
      { reportedBy: user._id },
      { assignedTo: user._id }
    ];

    if (driverVehicleIds.length > 0) {
      driverOrConditions.push({ relatedVehicle: { $in: driverVehicleIds } });
    }
    if (driverRouteIds.length > 0) {
      driverOrConditions.push({ relatedRoute: { $in: driverRouteIds } });
    }

    return { $or: driverOrConditions };
  }

  return {};
};

// @desc    Get all alerts
// @route   GET /api/alerts
// @access  Private
exports.getAlerts = async (req, res, next) => {
  try {
    const userRoleQuery = await getAlertQueryForUser(req.user);
    const query = { ...userRoleQuery };

    // Apply query filters
    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }
    if (req.query.severity) {
      query.severity = req.query.severity.toUpperCase();
    }
    if (req.query.alertType) {
      query.alertType = req.query.alertType.toUpperCase();
    }
    if (req.query.shipment) {
      query.relatedShipment = req.query.shipment;
    }
    if (req.query.vehicle) {
      query.relatedVehicle = req.query.vehicle;
    }
    if (req.query.route) {
      query.relatedRoute = req.query.route;
    }

    // Apply search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const searchOr = [
        { alertId: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { 'location.address': searchRegex },
        { 'location.region': searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // Sorting
    let sortBy = { createdAt: -1 };
    if (req.query.sort) {
      const parts = req.query.sort.split(':');
      sortBy = {};
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const startIndex = (page - 1) * limit;

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .populate({
        path: 'relatedShipment',
        select: 'shipmentId status goodsType assignedDriver',
        populate: { path: 'assignedDriver', select: 'name email role' }
      })
      .populate('relatedOrder', 'orderId status')
      .populate({
        path: 'relatedVehicle',
        select: 'vehicleId registrationNumber currentStatus assignedDriver',
        populate: { path: 'assignedDriver', select: 'name email role' }
      })
      .populate('relatedRoute', 'routeId routeName routeStatus')
      .populate('reportedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort(sortBy)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        alerts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single alert by ID
// @route   GET /api/alerts/:id
// @access  Private
exports.getAlertById = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate({
        path: 'relatedShipment',
        populate: { path: 'assignedDriver', select: 'name email role' }
      })
      .populate('relatedOrder')
      .populate({
        path: 'relatedVehicle',
        populate: { path: 'assignedDriver', select: 'name email role' }
      })
      .populate('relatedRoute')
      .populate('reportedBy', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    if (req.user.role === 'NGO') {
      const userRoleQuery = await getAlertQueryForUser(req.user);
      const isAllowed = await Alert.exists({ _id: alert._id, ...userRoleQuery });
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view alerts related to your own orders.',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    next(error);
  }
};

// @desc    Create manual alert
// @route   POST /api/alerts
// @access  Private (Admin)
exports.createAlert = async (req, res, next) => {
  try {
    const {
      title,
      description,
      alertType,
      severity,
      relatedShipment,
      relatedOrder,
      relatedVehicle,
      relatedRoute,
      location,
      metadata,
      assignedTo,
    } = req.body;

    if (!title || !description || !alertType || !severity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, alertType, and severity.',
      });
    }

    if (relatedShipment && !(await Shipment.findById(relatedShipment))) {
      return res.status(400).json({ success: false, message: 'Invalid relatedShipment ID.' });
    }
    if (relatedOrder && !(await Order.findById(relatedOrder))) {
      return res.status(400).json({ success: false, message: 'Invalid relatedOrder ID.' });
    }
    if (relatedVehicle && !(await Vehicle.findById(relatedVehicle))) {
      return res.status(400).json({ success: false, message: 'Invalid relatedVehicle ID.' });
    }
    if (relatedRoute && !(await Route.findById(relatedRoute))) {
      return res.status(400).json({ success: false, message: 'Invalid relatedRoute ID.' });
    }
    let finalAssignedTo = assignedTo || null;
    if (!finalAssignedTo && relatedShipment) {
      const shp = await Shipment.findById(relatedShipment).select('assignedDriver');
      if (shp && shp.assignedDriver) {
        finalAssignedTo = shp.assignedDriver;
      }
    }
    if (!finalAssignedTo && relatedVehicle) {
      const veh = await Vehicle.findById(relatedVehicle).select('assignedDriver');
      if (veh && veh.assignedDriver) {
        finalAssignedTo = veh.assignedDriver;
      }
    }

    const alert = new Alert({
      title,
      description,
      alertType: alertType.toUpperCase(),
      severity: severity.toUpperCase(),
      relatedShipment: relatedShipment || null,
      relatedOrder: relatedOrder || null,
      relatedVehicle: relatedVehicle || null,
      relatedRoute: relatedRoute || null,
      location: location || {},
      metadata: metadata || {},
      reportedBy: req.user.id,
      assignedTo: finalAssignedTo,
    });

    alert.history = [
      {
        action: 'Alert Created',
        performedBy: req.user.id,
        timestamp: new Date(),
        notes: 'Manually logged alert',
      },
    ];

    await alert.save();

    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: 'ALERT_CREATED',
        module: 'ALERTS',
        referenceId: alert.alertId,
        description: `Alert created: ${alert.title} [${alert.severity}]`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[alertController] Audit error:', audErr.message);
    }

    try {
      const { emitNewAlert } = require('../config/socket');
      emitNewAlert({
        _id: alert._id,
        alertId: alert.alertId,
        title: alert.title,
        description: alert.description,
        alertType: alert.alertType,
        severity: alert.severity,
        status: alert.status,
        relatedShipment: alert.relatedShipment,
        relatedVehicle: alert.relatedVehicle,
        relatedRoute: alert.relatedRoute,
        location: alert.location,
        createdAt: alert.createdAt
      });
    } catch (socErr) {
      console.warn('[alertController] Socket broadcast error:', socErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Update alert details
// @route   PUT /api/alerts/:id
// @access  Private (Admin)
exports.updateAlert = async (req, res, next) => {
  try {
    const { title, description, location, metadata } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (location) updates.location = { ...alert.location.toObject(), ...location };
    if (metadata) updates.metadata = { ...alert.metadata, ...metadata };

    const updatedAlert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        $set: updates,
        $push: {
          history: {
            action: 'Alert Updated',
            performedBy: req.user.id,
            timestamp: new Date(),
            notes: 'Alert details modified.',
          },
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Alert details updated successfully',
      data: updatedAlert,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    next(error);
  }
};

// @desc    Update alert status
// @route   PATCH /api/alerts/:id/status
// @access  Private
exports.updateAlertStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const allowedStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];

    if (!status || !allowedStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Please specify a valid status: ${allowedStatuses.join(', ')}`,
      });
    }

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const statusVal = status.toUpperCase();
    const prevStatus = alert.status;
    alert.status = statusVal;

    if (statusVal === 'ACKNOWLEDGED') {
      alert.acknowledgedAt = new Date();
    } else if (statusVal === 'RESOLVED') {
      alert.resolvedAt = new Date();
      alert.resolutionNotes = resolutionNotes || 'Resolved.';
    }

    alert.history.push({
      action: statusVal === 'ACKNOWLEDGED' ? 'Alert Acknowledged' : statusVal === 'RESOLVED' ? 'Alert Resolved' : 'Alert Dismissed',
      previousStatus: prevStatus,
      newStatus: statusVal,
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: resolutionNotes || '',
    });

    await alert.save();

    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: statusVal === 'ACKNOWLEDGED' ? 'ALERT_ACKNOWLEDGED' : statusVal === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_UPDATED',
        module: 'ALERTS',
        referenceId: alert.alertId,
        description: `Updated alert ${alert.alertId} status to ${statusVal}`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[alertController] Audit logging error:', audErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Alert status updated to ${statusVal} successfully`,
      data: alert,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    next(error);
  }
};

// @desc    Update alert severity
// @route   PATCH /api/alerts/:id/severity
// @access  Private (Admin)
exports.updateAlertSeverity = async (req, res, next) => {
  try {
    const { severity } = req.body;
    const allowedSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (!severity || !allowedSeverities.includes(severity.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Please specify a valid severity: ${allowedSeverities.join(', ')}`,
      });
    }

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const prevSeverity = alert.severity;
    const severityVal = severity.toUpperCase();
    alert.severity = severityVal;

    alert.history.push({
      action: 'Severity Changed',
      previousSeverity: prevSeverity,
      newSeverity: severityVal,
      performedBy: req.user.id,
      timestamp: new Date(),
    });

    await alert.save();

    res.status(200).json({
      success: true,
      message: `Alert severity updated to ${severityVal} successfully`,
      data: alert,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    next(error);
  }
};

// @desc    Assign alert
// @route   PATCH /api/alerts/:id/assign
// @access  Private (Admin)
exports.assignAlert = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    let targetUser = null;
    if (assignedTo && assignedTo !== '') {
      targetUser = await User.findById(assignedTo);
      if (!targetUser) {
        return res.status(400).json({ success: false, message: 'Assigned user not found' });
      }
    }

    alert.assignedTo = targetUser ? targetUser._id : null;

    alert.history.push({
      action: 'Alert Assigned',
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: targetUser ? `Assigned to ${targetUser.name}` : 'Unassigned',
    });

    await alert.save();

    const populated = await Alert.findById(alert._id)
      .populate({
        path: 'relatedShipment',
        populate: { path: 'assignedDriver', select: 'name email role' }
      })
      .populate({
        path: 'relatedVehicle',
        populate: { path: 'assignedDriver', select: 'name email role' }
      })
      .populate('assignedTo', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Alert assignment updated successfully',
      data: populated,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    next(error);
  }
};

// @desc    Get alert history log
// @route   GET /api/alerts/:id/history
// @access  Private
exports.getAlertHistory = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id).populate('history.performedBy', 'name email role');
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.status(200).json({
      success: true,
      data: alert.history,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    next(error);
  }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private (Admin only)
exports.deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Alert deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    next(error);
  }
};

// @desc    Get dynamic safety alerts and accessibility ratings for a shipment
// @route   GET /api/alerts/shipment/:shipmentId
// @access  Private
exports.getDynamicShipmentAlerts = async (req, res, next) => {
  try {
    const { getShipmentAlerts } = require('../services/alerts/alertService');
    const { shipmentId } = req.params;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    const alertsData = getShipmentAlerts(shipment);

    res.status(200).json({
      success: true,
      data: alertsData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overall alert statistics
// @route   GET /api/alerts/stats
// @access  Private
exports.getAlertStats = async (req, res, next) => {
  try {
    const userRoleQuery = await getAlertQueryForUser(req.user);

    const total = await Alert.countDocuments({ ...userRoleQuery });
    const active = await Alert.countDocuments({ ...userRoleQuery, status: 'ACTIVE' });
    const critical = await Alert.countDocuments({ ...userRoleQuery, severity: 'CRITICAL', status: { $ne: 'RESOLVED' } });
    const high = await Alert.countDocuments({ ...userRoleQuery, severity: 'HIGH', status: { $ne: 'RESOLVED' } });
    const acknowledged = await Alert.countDocuments({ ...userRoleQuery, status: 'ACKNOWLEDGED' });
    const resolved = await Alert.countDocuments({ ...userRoleQuery, status: 'RESOLVED' });

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        critical,
        high,
        acknowledged,
        resolved
      }
    });
  } catch (error) {
    next(error);
  }
};
