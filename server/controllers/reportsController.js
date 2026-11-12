const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { getRouteEnvironmentalRisk } = require('../services/environmentalRisk/environmentalRiskService');

// Date Range Filter builder helper
const buildReportDateFilter = (req) => {
  const { startDate, endDate, range } = req.query;
  const filter = {};
  let start = null;
  let end = null;

  if (range && range !== 'all' && range !== 'custom') {
    const today = new Date();
    if (range === 'today') {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (range === '7days') {
      start = new Date();
      start.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (range === '30days') {
      start = new Date();
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (range === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }
  } else if (startDate || endDate) {
    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }
  }

  if (start || end) {
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = start;
    if (end) filter.createdAt.$lte = end;
  }

  return filter;
};

const buildRoleScope = async (user) => {
  if (user && user.role === 'DRIVER') {
    const driverShipments = await Shipment.find({ assignedDriver: user._id }).select('_id assignedVehicle');
    const driverShipmentIds = driverShipments.map(s => s._id);
    const driverVehicleIds = driverShipments.map(s => s.assignedVehicle).filter(Boolean);

    return {
      shipments: { assignedDriver: user._id },
      orders: {},
      vehicles: { $or: [{ assignedDriver: user._id }, { _id: { $in: driverVehicleIds } }] },
      routes: { assignedDriver: user._id },
      alerts: {
        $or: [
          { assignedTo: user._id },
          { relatedShipment: { $in: driverShipmentIds } }
        ]
      }
    };
  }

  return {
    shipments: {},
    orders: {},
    vehicles: {},
    routes: {},
    alerts: {}
  };
};

// @desc    Get High-level operational overview report summary
// @route   GET /api/reports/overview
// @access  Private
exports.getOverviewReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);

    // Shipments overview
    const shipmentsTotal = await Shipment.countDocuments({ ...dateFilter, ...scope.shipments });
    const shipmentsActive = await Shipment.countDocuments({ 
      status: { $in: ['IN_TRANSIT', 'ROUTE_SELECTED', 'ROUTE_PENDING', 'AT_RISK', 'DELAYED', 'CREATED'] },
      ...dateFilter,
      ...scope.shipments
    });
    const shipmentsDelivered = await Shipment.countDocuments({ status: 'DELIVERED', ...dateFilter, ...scope.shipments });
    const shipmentsDelayed = await Shipment.countDocuments({ status: 'DELAYED', ...dateFilter, ...scope.shipments });
    const shipmentsAtRisk = await Shipment.countDocuments({ status: 'AT_RISK', ...dateFilter, ...scope.shipments });
    const shipmentsPending = await Shipment.countDocuments({ status: { $in: ['CREATED', 'ROUTE_PENDING'] }, ...dateFilter, ...scope.shipments });

    // Orders overview
    const ordersTotal = await Order.countDocuments({ ...dateFilter, ...scope.orders });
    const ordersPending = await Order.countDocuments({ status: 'PENDING', ...dateFilter, ...scope.orders });
    const ordersActive = await Order.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'ASSIGNED'] }, ...dateFilter, ...scope.orders });
    const ordersCompleted = await Order.countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED'] }, ...dateFilter, ...scope.orders });
    const ordersCancelled = await Order.countDocuments({ status: 'CANCELLED', ...dateFilter, ...scope.orders });
    const ordersConverted = await Order.countDocuments({ assignedShipment: { $exists: true, $ne: null }, ...dateFilter, ...scope.orders });

    // Vehicles overview
    const vehiclesTotal = await Vehicle.countDocuments(scope.vehicles);
    const vehiclesActive = await Vehicle.countDocuments({ currentStatus: { $in: ['IN_TRANSIT', 'ASSIGNED'] }, ...scope.vehicles });
    const vehiclesAvailable = await Vehicle.countDocuments({ currentStatus: 'AVAILABLE', ...scope.vehicles });
    const vehiclesAssigned = await Vehicle.countDocuments({ currentStatus: 'ASSIGNED', ...scope.vehicles });
    const vehiclesMaintenance = await Vehicle.countDocuments({ currentStatus: 'MAINTENANCE', ...scope.vehicles });

    // Routes overview
    const routesTotal = await Route.countDocuments({});
    const routesSelected = await Shipment.countDocuments({
      'selectedRoute.name': { $exists: true, $ne: null },
      ...dateFilter,
      ...scope.shipments
    });
    const routesActive = await Shipment.countDocuments({
      'selectedRoute.name': { $exists: true, $ne: null },
      status: { $in: ['IN_TRANSIT', 'ROUTE_SELECTED'] },
      ...dateFilter,
      ...scope.shipments
    });

    // Unresolved alerts
    const alertsActive = await Alert.countDocuments({ status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const alertsCritical = await Alert.countDocuments({ severity: 'CRITICAL', status: { $ne: 'RESOLVED' }, ...dateFilter, ...scope.alerts });
    const alertsHigh = await Alert.countDocuments({ severity: 'HIGH', status: { $ne: 'RESOLVED' }, ...dateFilter, ...scope.alerts });
    const alertsAcknowledged = await Alert.countDocuments({ status: 'ACKNOWLEDGED', ...dateFilter, ...scope.alerts });
    const alertsResolved = await Alert.countDocuments({ status: 'RESOLVED', ...dateFilter, ...scope.alerts });

    // Rates
    const deliveryCompletionRate = shipmentsTotal > 0 ? parseFloat(((shipmentsDelivered / shipmentsTotal) * 100).toFixed(1)) : 0;
    const vehicleUtilizationRate = vehiclesTotal > 0 ? parseFloat(((vehiclesActive / vehiclesTotal) * 100).toFixed(1)) : 0;
    const orderConversionRate = ordersTotal > 0 ? parseFloat(((ordersConverted / ordersTotal) * 100).toFixed(1)) : 0;

    // Single Most Relevant Active Shipment for Detailed Display
    const activeShipment = await Shipment.findOne({
      status: { $in: ['IN_TRANSIT', 'ROUTE_SELECTED', 'AT_RISK', 'DELAYED'] },
      ...scope.shipments
    })
      .populate('assignedDriver', 'name phone email role')
      .populate('assignedVehicle', 'registrationNumber vehicleType capacity fuelType')
      .populate('assignedOrder', 'orderId customerName cargoDescription quantity pickupLocation deliveryLocation')
      .sort({ updatedAt: -1 })
      .lean();

    // Route Safety & Hazard Metrics derived from Shipments with selectedRoute
    const shipmentsWithRoute = await Shipment.find({
      'selectedRoute.name': { $exists: true, $ne: null },
      ...dateFilter,
      ...scope.shipments
    });

    let totalSafetyScore = 0;
    let lowRiskRoutes = 0;
    let moderateRiskRoutes = 0;
    let highRiskRoutes = 0;
    let criticalRiskRoutes = 0;
    let heavyRainAffected = 0;
    let floodRiskAffected = 0;
    let landslideRiskAffected = 0;
    let stormRiskAffected = 0;
    let highWindAffected = 0;
    let poorVisibilityAffected = 0;

    shipmentsWithRoute.forEach((s) => {
      const sr = s.selectedRoute;
      const score = typeof sr.safetyScore === 'number' ? sr.safetyScore : (100 - (sr.riskScore || 20));
      totalSafetyScore += score;
      const level = (sr.riskLevel || 'LOW').toUpperCase();

      if (level === 'CRITICAL' || score < 30) criticalRiskRoutes++;
      else if (level === 'HIGH' || score < 60) highRiskRoutes++;
      else if (level === 'MEDIUM' || level === 'MODERATE' || score < 80) moderateRiskRoutes++;
      else lowRiskRoutes++;

      let envData = null;
      if (sr && sr.coordinates && sr.coordinates.length > 0) {
        try {
          envData = getRouteEnvironmentalRisk(sr);
        } catch (e) {
          // ignore sampling error
        }
      }

      const rfStr = JSON.stringify(sr.riskFactors || []).toLowerCase();

      // Heavy Rain
      if (
        sr.weatherRisk?.hasHeavyRain ||
        (sr.weatherRisk?.maxRainfall && sr.weatherRisk.maxRainfall > 5) ||
        rfStr.includes('rain') || rfStr.includes('monsoon') || rfStr.includes('downpour') ||
        (envData && envData.rainfall && envData.rainfall.score > 25)
      ) {
        heavyRainAffected++;
      }

      // Flood Risk
      if (
        sr.hazardAnalysis?.floodRisk ||
        rfStr.includes('flood') || rfStr.includes('waterlog') || rfStr.includes('inundated') ||
        (envData && envData.flood && envData.flood.score > 30)
      ) {
        floodRiskAffected++;
      }

      // Landslide Risk
      if (
        sr.hazardAnalysis?.landslideRisk ||
        rfStr.includes('landslide') || rfStr.includes('mudslide') || rfStr.includes('rockfall') ||
        (envData && envData.landslide && envData.landslide.score > 30)
      ) {
        landslideRiskAffected++;
      }

      // Storm Risk
      if (
        sr.hazardAnalysis?.stormRisk ||
        rfStr.includes('storm') || rfStr.includes('thunder') || rfStr.includes('cyclone') ||
        (envData && envData.samples && envData.samples.some(samp => (samp.weather?.condition || '').toLowerCase().includes('storm')))
      ) {
        stormRiskAffected++;
      }

      // High Wind
      if (
        (sr.weatherRisk?.maxWindSpeed && sr.weatherRisk.maxWindSpeed > 15) ||
        rfStr.includes('wind') || rfStr.includes('gale') ||
        (envData && envData.samples && envData.samples.some(samp => (samp.weather?.windspeed || 0) > 15))
      ) {
        highWindAffected++;
      }

      // Poor Visibility
      if (
        (sr.weatherRisk?.visibility && sr.weatherRisk.visibility < 5000) ||
        rfStr.includes('visibility') || rfStr.includes('fog') || rfStr.includes('smog') ||
        (envData && envData.visibility && envData.visibility.score > 30)
      ) {
        poorVisibilityAffected++;
      }
    });

    const averageSafetyScore = shipmentsWithRoute.length > 0 ? Math.round(totalSafetyScore / shipmentsWithRoute.length) : 85;

    // Top High-Risk Active Shipments
    const topHighRiskShipments = await Shipment.find({
      status: { $in: ['IN_TRANSIT', 'ROUTE_SELECTED', 'AT_RISK', 'DELAYED'] },
      'selectedRoute.name': { $exists: true, $ne: null },
      ...scope.shipments
    })
      .sort({ 'selectedRoute.riskScore': -1, 'selectedRoute.safetyScore': 1 })
      .limit(5);

    // Recent Alerts
    const recentAlerts = await Alert.find({ ...dateFilter, ...scope.alerts })
      .populate('relatedShipment', 'shipmentId status')
      .sort({ createdAt: -1 })
      .limit(5);

    // Audit logs query from AuditLog collection + real stored Alert history
    const AuditLog = require('../models/AuditLog');
    const dbAuditLogs = await AuditLog.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(20);

    const recentAuditLogs = dbAuditLogs.map((a) => ({
      timestamp: a.createdAt,
      user: a.userName || 'System Auto-Engine',
      role: a.role || 'SYSTEM',
      action: a.action,
      module: a.module,
      reference: a.referenceId || 'LOG',
      description: a.description,
      status: a.status || 'SUCCESS'
    }));

    // Fallback: Add real stored Alert history
    if (recentAuditLogs.length < 10) {
      const alertsWithHistory = await Alert.find({ ...scope.alerts })
        .populate('history.performedBy', 'name email role')
        .sort({ updatedAt: -1 })
        .limit(10);

      alertsWithHistory.forEach((a) => {
        if (a.history && a.history.length > 0) {
          a.history.forEach((h) => {
            recentAuditLogs.push({
              timestamp: h.timestamp,
              user: h.performedBy?.name || 'System Auto-Engine',
              role: h.performedBy?.role || 'SYSTEM',
              action: h.action,
              module: 'ALERTS',
              reference: a.alertId,
              description: h.notes || `Alert ${a.alertId} updated`,
              status: 'SUCCESS'
            });
          });
        }
      });
    }

    recentAuditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      data: {
        activeShipment,
        summary: {
          totalShipments: shipmentsTotal,
          activeShipments: shipmentsActive,
          deliveredShipments: shipmentsDelivered,
          delayedShipments: shipmentsDelayed,
          atRiskShipments: shipmentsAtRisk,
          pendingShipments: shipmentsPending,
          deliveryCompletionRate,
          totalOrders: ordersTotal,
          activeOrders: ordersActive,
          completedOrders: ordersCompleted,
          pendingOrders: ordersPending,
          cancelledOrders: ordersCancelled,
          convertedOrders: ordersConverted,
          orderConversionRate,
          totalVehicles: vehiclesTotal,
          activeVehicles: vehiclesActive,
          availableVehicles: vehiclesAvailable,
          assignedVehicles: vehiclesAssigned,
          maintenanceVehicles: vehiclesMaintenance,
          vehicleUtilizationRate,
          totalRoutes: routesTotal,
          selectedRoutes: routesSelected,
          activeRoutes: routesActive,
          unresolvedAlerts: alertsActive,
          criticalAlerts: alertsCritical,
          highAlerts: alertsHigh,
          acknowledgedAlerts: alertsAcknowledged,
          resolvedAlerts: alertsResolved,
          averageSafetyScore,
          lowRiskRoutes,
          moderateRiskRoutes,
          highRiskRoutes,
          criticalRiskRoutes,
          environmentalImpact: {
            totalEvaluatedShipments: shipmentsWithRoute.length,
            affectedCount: heavyRainAffected + floodRiskAffected + stormRiskAffected + landslideRiskAffected + highWindAffected + poorVisibilityAffected,
            heavyRain: heavyRainAffected,
            floodRisk: floodRiskAffected,
            landslideRisk: landslideRiskAffected,
            stormRisk: stormRiskAffected,
            highWind: highWindAffected,
            poorVisibility: poorVisibilityAffected,
            lastUpdated: new Date().toISOString(),
            status: 'LIVE'
          },
          auditLogs: recentAuditLogs.slice(0, 10)
        },
        topHighRiskShipments,
        recentAlerts,
        auditLogs: recentAuditLogs.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed shipments report data and records
// @route   GET /api/reports/shipments
// @access  Private
exports.getShipmentReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status } = req.query;

    const queryFilter = { ...dateFilter, ...scope.shipments };
    if (status && status !== '') {
      queryFilter.status = status;
    }

    const shipmentsTotal = await Shipment.countDocuments({ ...dateFilter, ...scope.shipments });
    const shipmentsDelivered = await Shipment.countDocuments({ status: 'DELIVERED', ...dateFilter, ...scope.shipments });
    const shipmentsDelayed = await Shipment.countDocuments({ status: 'DELAYED', ...dateFilter, ...scope.shipments });
    const shipmentsInTransit = await Shipment.countDocuments({ status: 'IN_TRANSIT', ...dateFilter, ...scope.shipments });
    const shipmentsPending = await Shipment.countDocuments({ status: 'CREATED', ...dateFilter, ...scope.shipments });

    const statusCounts = await Shipment.aggregate([
      { $match: { ...dateFilter, ...scope.shipments } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const records = await Shipment.find(queryFilter)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: shipmentsTotal,
          delivered: shipmentsDelivered,
          delayed: shipmentsDelayed,
          inTransit: shipmentsInTransit,
          pending: shipmentsPending,
          statusBreakdown: statusCounts
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed orders report data and records
// @route   GET /api/reports/orders
// @access  Private
exports.getOrderReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status } = req.query;

    const queryFilter = { ...dateFilter, ...scope.orders };
    if (status && status !== '') {
      queryFilter.status = status;
    }

    const ordersTotal = await Order.countDocuments({ ...dateFilter, ...scope.orders });
    const ordersPending = await Order.countDocuments({ status: 'PENDING', ...dateFilter, ...scope.orders });
    const ordersAssigned = await Order.countDocuments({ status: 'ASSIGNED', ...dateFilter, ...scope.orders });
    const ordersCompleted = await Order.countDocuments({ status: 'DELIVERED', ...dateFilter, ...scope.orders });

    const statusCounts = await Order.aggregate([
      { $match: { ...dateFilter, ...scope.orders } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const rawRecords = await Order.find(queryFilter)
      .populate('createdBy', 'name email organization')
      .populate('assignedShipment', 'shipmentId status')
      .lean();

    const orderIds = rawRecords.map(o => o._id);
    const orderCodes = rawRecords.map(o => o.orderId).filter(Boolean);

    const linkedShipments = await Shipment.find({
      $or: [
        { assignedOrder: { $in: orderIds } },
        { orderId: { $in: orderCodes } }
      ]
    }).select('shipmentId status assignedOrder orderId').lean();

    const shipmentMapByOrder = {};
    linkedShipments.forEach(s => {
      if (s.assignedOrder) shipmentMapByOrder[s.assignedOrder.toString()] = s;
      if (s.orderId) shipmentMapByOrder[s.orderId] = s;
    });

    const records = rawRecords.map(r => {
      const linked = r.assignedShipment || shipmentMapByOrder[r._id.toString()] || (r.orderId ? shipmentMapByOrder[r.orderId] : null);
      return {
        ...r,
        orderId: r.orderId || ('ORD-' + r._id.toString().slice(-6).toUpperCase()),
        assignedShipment: linked ? { shipmentId: linked.shipmentId, status: linked.status } : null
      };
    });

    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: ordersTotal,
          pending: ordersPending,
          assigned: ordersAssigned,
          completed: ordersCompleted,
          statusBreakdown: statusCounts
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed vehicle usage report data and records
// @route   GET /api/reports/vehicles
// @access  Private
exports.getVehicleReport = async (req, res, next) => {
  try {
    const scope = await buildRoleScope(req.user);
    const { status } = req.query;

    const queryFilter = { ...scope.vehicles };
    if (status && status !== '') {
      queryFilter.currentStatus = status;
    }

    const total = await Vehicle.countDocuments(scope.vehicles);
    const available = await Vehicle.countDocuments({ currentStatus: 'AVAILABLE', ...scope.vehicles });
    const assigned = await Vehicle.countDocuments({ currentStatus: { $in: ['ASSIGNED', 'IN_TRANSIT'] }, ...scope.vehicles });
    const maintenance = await Vehicle.countDocuments({ currentStatus: 'MAINTENANCE', ...scope.vehicles });

    const records = await Vehicle.find(queryFilter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          available,
          assigned,
          maintenance
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed routes report data and records from Shipment.selectedRoute
// @route   GET /api/reports/routes
// @access  Private
exports.getRouteReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status, riskLevel } = req.query;

    const queryFilter = {
      'selectedRoute.name': { $exists: true, $ne: null },
      ...dateFilter,
      ...scope.shipments
    };

    if (status && status !== '') {
      queryFilter.status = status;
    }

    const shipmentsWithRoute = await Shipment.find(queryFilter)
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email')
      .sort({ updatedAt: -1 });

    let total = shipmentsWithRoute.length;
    let lowRiskCount = 0;
    let moderateRiskCount = 0;
    let highRiskCount = 0;
    let criticalRiskCount = 0;
    let totalDist = 0;
    let totalDur = 0;
    let totalSafety = 0;

    const records = shipmentsWithRoute.map((s) => {
      const sr = s.selectedRoute;
      const dist = sr.distanceKm || 0;
      const dur = sr.estimatedDurationMinutes || 0;
      const safety = typeof sr.safetyScore === 'number' ? sr.safetyScore : (100 - (sr.riskScore || 20));
      const level = (sr.riskLevel || 'LOW').toUpperCase();

      totalDist += dist;
      totalDur += dur;
      totalSafety += safety;

      if (level === 'CRITICAL' || safety < 30) criticalRiskCount++;
      else if (level === 'HIGH' || safety < 60) highRiskCount++;
      else if (level === 'MEDIUM' || level === 'MODERATE' || safety < 80) moderateRiskCount++;
      else lowRiskCount++;

      return {
        _id: s._id,
        shipmentId: s.shipmentId,
        goodsType: s.goodsType,
        corridorId: sr.routeId || `RT-${s.shipmentId}`,
        name: sr.name || 'Selected Route Corridor',
        routeName: sr.name || 'Selected Route Corridor',
        origin: s.pickup?.locationName || 'Pickup Node',
        destination: s.destination?.locationName || 'Destination Node',
        distance: dist,
        distanceKm: dist,
        estimatedDuration: dur,
        durationMinutes: dur,
        safetyScore: safety,
        riskScore: sr.riskScore || (100 - safety),
        riskLevel: level,
        riskFactors: sr.riskFactors || [],
        weatherRisk: sr.weatherRisk || {},
        hazardAnalysis: sr.hazardAnalysis || {},
        routeStatus: s.status === 'IN_TRANSIT' ? 'ACTIVE' : s.status === 'DELIVERED' ? 'COMPLETED' : 'PLANNED',
        createdAt: sr.selectedAt || s.createdAt || new Date()
      };
    });

    let filteredRecords = records;
    if (riskLevel && riskLevel !== '') {
      filteredRecords = records.filter(r => r.riskLevel === riskLevel.toUpperCase());
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          active: records.filter(r => r.routeStatus === 'ACTIVE').length,
          completed: records.filter(r => r.routeStatus === 'COMPLETED').length,
          planned: records.filter(r => r.routeStatus === 'PLANNED').length,
          lowRisk: lowRiskCount,
          moderateRisk: moderateRiskCount,
          highRisk: highRiskCount,
          criticalRisk: criticalRiskCount,
          averageDistanceKm: total > 0 ? parseFloat((totalDist / total).toFixed(1)) : 0,
          averageDurationMinutes: total > 0 ? Math.round(totalDur / total) : 0,
          averageSafetyScore: total > 0 ? Math.round(totalSafety / total) : 85
        },
        records: filteredRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed risk alerts report data and records
// @route   GET /api/reports/alerts
// @access  Private
exports.getAlertReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status, severity } = req.query;

    const queryFilter = { ...dateFilter, ...scope.alerts };
    if (status && status !== '') {
      queryFilter.status = status;
    }
    if (severity && severity !== '') {
      queryFilter.severity = severity;
    }

    const total = await Alert.countDocuments({ ...dateFilter, ...scope.alerts });
    const active = await Alert.countDocuments({ status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const resolved = await Alert.countDocuments({ status: 'RESOLVED', ...dateFilter, ...scope.alerts });
    const critical = await Alert.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const high = await Alert.countDocuments({ severity: 'HIGH', status: 'ACTIVE', ...dateFilter, ...scope.alerts });

    const severityCounts = await Alert.aggregate([
      { $match: { ...dateFilter, ...scope.alerts } },
      { $group: { _id: "$severity", count: { $sum: 1 } } }
    ]);

    const records = await Alert.find(queryFilter)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('relatedShipment', 'shipmentId status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          active,
          resolved,
          critical,
          high,
          severityBreakdown: severityCounts
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed Driver operational report metrics
// @route   GET /api/reports/driver
// @access  Private (Driver/Admin)
exports.getDriverReport = async (req, res, next) => {
  try {
    const driverId = req.user._id;
    const dateFilter = buildReportDateFilter(req);

    // 1. Fetch shipments assigned to this Driver
    const shipmentQuery = { assignedDriver: driverId, ...dateFilter };
    const shipments = await Shipment.find(shipmentQuery)
      .populate('assignedVehicle', 'registrationNumber vehicleType fuelType currentStatus capacity')
      .populate('requestedBy', 'name email')
      .sort({ updatedAt: -1 });

    const totalAssignedShipments = shipments.length;
    const completedShipments = shipments.filter(s => s.status === 'DELIVERED').length;
    const inTransitShipments = shipments.filter(s => s.status === 'IN_TRANSIT').length;
    const pendingShipments = shipments.filter(s => ['CREATED', 'ROUTE_PENDING', 'ROUTE_SELECTED'].includes(s.status)).length;
    const cancelledShipments = shipments.filter(s => s.status === 'CANCELLED').length;
    const delayedShipments = shipments.filter(s => s.status === 'DELAYED' || s.status === 'AT_RISK').length;

    // Distances & Durations from REAL database data only
    let totalRouteDistance = 0;
    let totalDistanceTravelled = 0;
    let totalDeliveryDurationMins = 0;
    let deliveredCount = 0;

    shipments.forEach(s => {
      const dist = s.selectedRoute?.distanceKm || 0;
      totalRouteDistance += dist;
      
      const actualTravelled = s.actualDistanceTravelled || 0;
      if (s.status === 'DELIVERED') {
        totalDistanceTravelled += (actualTravelled > 0 ? actualTravelled : dist);
        
        if (s.createdAt && (s.actualDeliveryTime || s.updatedAt)) {
          const deliveryTime = new Date(s.actualDeliveryTime || s.updatedAt);
          const startTime = new Date(s.createdAt);
          const durationMins = Math.max(0, Math.round((deliveryTime - startTime) / (1000 * 60)));
          totalDeliveryDurationMins += durationMins;
          deliveredCount++;
        }
      } else {
        totalDistanceTravelled += actualTravelled;
      }
    });

    const averageDeliveryTimeMinutes = deliveredCount > 0 ? Math.round(totalDeliveryDurationMins / deliveredCount) : 0;

    // Delivery Performance
    const totalDeliveries = totalAssignedShipments;
    const successfulDeliveries = completedShipments;
    const delayedDeliveries = delayedShipments;
    const onTimeDeliveries = Math.max(0, successfulDeliveries - delayedDeliveries);
    const onTimeDeliveryPercentage = totalDeliveries > 0 ? Math.round((onTimeDeliveries / totalDeliveries) * 100) : 100;

    // 2. Fetch driver's alerts
    const shipmentIds = shipments.map(s => s._id);
    const alertQuery = {
      $or: [
        { assignedTo: driverId },
        { relatedShipment: { $in: shipmentIds } }
      ],
      ...dateFilter
    };

    const alerts = await Alert.find(alertQuery)
      .populate('relatedShipment', 'shipmentId status')
      .sort({ createdAt: -1 });

    const totalAlerts = alerts.length;
    const activeAlerts = alerts.filter(a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED').length;
    const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
    const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;
    const mediumAlerts = alerts.filter(a => a.severity === 'MEDIUM').length;
    const lowAlerts = alerts.filter(a => a.severity === 'LOW').length;
    const routeDeviationAlerts = alerts.filter(a => a.alertType === 'ROUTE_DEVIATION').length;

    // 3. Driver Vehicle Information (All vehicles assigned to driver or driver's shipments)
    const assignedVehiclesMap = new Map();
    shipments.forEach(s => {
      if (s.assignedVehicle && s.assignedVehicle._id) {
        const vId = s.assignedVehicle._id.toString();
        if (!assignedVehiclesMap.has(vId)) {
          assignedVehiclesMap.set(vId, {
            _id: s.assignedVehicle._id,
            registrationNumber: s.assignedVehicle.registrationNumber || 'NOT SPECIFIED',
            vehicleType: s.assignedVehicle.vehicleType || 'NOT SPECIFIED',
            fuelType: s.assignedVehicle.fuelType || 'DIESEL',
            shipmentId: s.shipmentId,
            vehicleStatus: s.assignedVehicle.currentStatus || 'AVAILABLE',
            assignmentStatus: s.status === 'IN_TRANSIT' ? 'In Transit' : 'Assigned',
            tripStatus: s.status,
            capacity: s.assignedVehicle.capacity ? `${s.assignedVehicle.capacity} T` : 'N/A'
          });
        }
      }
    });

    const driverVehiclesFromDb = await Vehicle.find({ assignedDriver: driverId });
    driverVehiclesFromDb.forEach(v => {
      const vId = v._id.toString();
      if (!assignedVehiclesMap.has(vId)) {
        assignedVehiclesMap.set(vId, {
          _id: v._id,
          registrationNumber: v.registrationNumber || 'NOT SPECIFIED',
          vehicleType: v.vehicleType || 'NOT SPECIFIED',
          fuelType: v.fuelType || 'DIESEL',
          shipmentId: 'None',
          vehicleStatus: v.currentStatus || 'AVAILABLE',
          assignmentStatus: 'Assigned',
          tripStatus: 'AVAILABLE',
          capacity: v.capacity ? `${v.capacity} T` : 'N/A'
        });
      }
    });

    const assignedVehicles = Array.from(assignedVehiclesMap.values());

    // 4. My Shipment Routes List (Origin -> Destination Summary)
    const shipmentRoutes = shipments.map(s => {
      const routeDist = s.selectedRoute?.distanceKm || 0;
      const actualTravelled = s.actualDistanceTravelled || 0;
      const remainingDist = s.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(routeDist - actualTravelled));
      
      return {
        _id: s._id,
        shipmentId: s.shipmentId,
        from: s.pickup?.locationName || 'N/A',
        to: s.destination?.locationName || 'N/A',
        routeName: s.selectedRoute?.name || 'Selected Route Corridor',
        distanceKm: routeDist,
        status: s.status,
        remainingDistanceKm: remainingDist,
        eta: s.status === 'DELIVERED' ? '0 mins' : (s.selectedRoute?.estimatedDurationMinutes ? `${Math.round(s.selectedRoute.estimatedDurationMinutes / 60)} hrs` : 'N/A'),
        routeDeviations: alerts.filter(a => a.relatedShipment?._id?.toString() === s._id.toString() && a.alertType === 'ROUTE_DEVIATION').length,
        routeAlerts: alerts.filter(a => a.relatedShipment?._id?.toString() === s._id.toString()).length
      };
    });

    // 5. Current Active Shipment
    const activeShipmentObj = shipments.find(s => s.status === 'IN_TRANSIT') || shipments.find(s => ['ROUTE_SELECTED', 'ROUTE_PENDING', 'CREATED', 'AT_RISK', 'DELAYED'].includes(s.status)) || null;

    let currentActiveShipment = null;
    if (activeShipmentObj) {
      const activeRouteDist = activeShipmentObj.selectedRoute?.distanceKm || 0;
      const activeTravelled = activeShipmentObj.actualDistanceTravelled || 0;
      const activeRemaining = activeShipmentObj.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(activeRouteDist - activeTravelled));

      currentActiveShipment = {
        _id: activeShipmentObj._id,
        shipmentId: activeShipmentObj.shipmentId,
        goodsType: activeShipmentObj.goodsType,
        quantity: activeShipmentObj.quantity,
        unit: activeShipmentObj.unit,
        from: activeShipmentObj.pickup?.locationName || 'N/A',
        to: activeShipmentObj.destination?.locationName || 'N/A',
        routeName: activeShipmentObj.selectedRoute?.name || 'Selected Route Corridor',
        vehicleNumber: activeShipmentObj.assignedVehicle?.registrationNumber || activeShipmentObj.vehicleNumber || 'NOT SPECIFIED',
        status: activeShipmentObj.status,
        distanceToPickup: activeShipmentObj.status === 'IN_TRANSIT' ? 'Arrived at Pickup' : 'N/A',
        etaToPickup: activeShipmentObj.status === 'IN_TRANSIT' ? 'Arrived' : 'N/A',
        remainingDistance: `${activeRemaining} km`,
        routeDeviation: routeDeviationAlerts > 0 ? 'Deviated Corridor Alert' : 'On Prescribed Corridor'
      };
    }

    // 6. Active Trip / GPS summary
    const activeShipment = shipments.find(s => s.status === 'IN_TRANSIT') || shipments[0];
    let tripGps = {
      hasGps: false,
      tripStartTime: activeShipment ? (activeShipment.updatedAt || activeShipment.createdAt) : null,
      lastGpsUpdate: activeShipment?.liveLocation?.updatedAt || null,
      currentLocation: activeShipment?.liveLocation?.latitude 
        ? `${activeShipment.liveLocation.latitude.toFixed(4)}, ${activeShipment.liveLocation.longitude.toFixed(4)}`
        : 'Live location unavailable',
      totalDistanceTravelled: `${totalDistanceTravelled} km`,
      averageSpeed: activeShipment?.liveLocation?.speed ? `${activeShipment.liveLocation.speed} km/h` : 'N/A',
      maxSpeed: activeShipment?.liveLocation?.speed ? `${activeShipment.liveLocation.speed} km/h` : 'N/A',
      gpsAccuracy: activeShipment?.liveLocation?.accuracy ? `±${Math.round(activeShipment.liveLocation.accuracy)}m` : 'N/A',
      routeDeviations: routeDeviationAlerts
    };

    if (activeShipment && activeShipment.liveLocation && activeShipment.liveLocation.latitude) {
      tripGps.hasGps = true;
    }

    // 7. Route performance & hazards
    const activeRouteTotalDist = activeShipment?.selectedRoute?.distanceKm || 0;
    const activeRouteTravelled = activeShipment?.status === 'DELIVERED' ? activeRouteTotalDist : (activeShipment?.actualDistanceTravelled || 0);
    const activeRouteRemaining = activeShipment?.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(activeRouteTotalDist - activeRouteTravelled));

    const routeInfo = activeShipment?.selectedRoute ? {
      name: activeShipment.selectedRoute.name || 'Selected Route Corridor',
      origin: activeShipment.pickup?.locationName || 'N/A',
      destination: activeShipment.destination?.locationName || 'N/A',
      totalDistance: activeRouteTotalDist,
      distanceTravelled: activeRouteTravelled,
      remainingDistance: activeRouteRemaining,
      eta: activeShipment.status === 'DELIVERED' ? '0 mins' : (activeShipment.selectedRoute.estimatedDurationMinutes ? `${Math.round(activeShipment.selectedRoute.estimatedDurationMinutes / 60)} hrs` : 'N/A'),
      routeDeviations: routeDeviationAlerts,
      alertCount: alerts.length,
      routeStatus: activeShipment.status === 'IN_TRANSIT' ? 'ACTIVE' : activeShipment.status === 'DELIVERED' ? 'COMPLETED' : 'PLANNED',
      riskLevel: activeShipment.selectedRoute.riskLevel || 'LOW',
      hazards: alerts.filter(a => ['CORRIDOR_HAZARD', 'WEATHER_WARNING', 'TRANSIT_DELAY', 'ROUTE_DEVIATION'].includes(a.alertType))
    } : null;

    // 8. Fetch driver's operational audit logs
    const AuditLog = require('../models/AuditLog');
    const dbAuditLogs = await AuditLog.find({
      $or: [
        { user: driverId },
        { referenceId: { $in: shipmentIds.map(id => id.toString()) } },
        { userName: req.user.name }
      ],
      ...dateFilter
    }).sort({ createdAt: -1 }).limit(20);

    const driverAuditLogs = dbAuditLogs.map(a => ({
      _id: a._id,
      timestamp: a.createdAt,
      action: a.action,
      module: a.module,
      shipmentId: a.referenceId || 'N/A',
      description: a.description || `Driver action ${a.action}`,
      status: a.status
    }));

    if (driverAuditLogs.length < 5) {
      shipments.forEach(s => {
        driverAuditLogs.push({
          _id: `shipment-log-${s._id}`,
          timestamp: s.updatedAt || s.createdAt,
          action: s.status === 'DELIVERED' ? 'DELIVERY_COMPLETED' : s.status === 'IN_TRANSIT' ? 'TRANSIT_UPDATED' : 'SHIPMENT_ASSIGNED',
          module: 'SHIPMENTS',
          shipmentId: s.shipmentId,
          description: `Shipment ${s.shipmentId} updated to status ${s.status}`,
          status: 'SUCCESS'
        });
      });
      driverAuditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.status(200).json({
      success: true,
      data: {
        driverInfo: {
          id: driverId,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        },
        summary: {
          totalAssignedShipments,
          completedShipments,
          inTransitShipments,
          pendingShipments,
          cancelledShipments,
          delayedShipments,
          totalRouteDistance,
          totalDistanceTravelled,
          averageDeliveryTimeMinutes,
          activeAlerts,
          routeDeviations: routeDeviationAlerts,
          vehiclesAssigned: assignedVehicles.length
        },
        deliveryPerformance: {
          totalDeliveries,
          successfulDeliveries,
          pendingDeliveries: pendingShipments + inTransitShipments,
          cancelledDeliveries: cancelledShipments,
          delayedDeliveries,
          onTimeDeliveries,
          onTimeDeliveryPercentage,
          averageDeliveryTimeMinutes
        },
        currentActiveShipment,
        assignedVehicles,
        shipmentRoutes,
        routePerformance: routeInfo,
        tripGps,
        vehicle: assignedVehicles[0] || null,
        alertSummary: {
          totalAlerts,
          criticalAlerts,
          highAlerts,
          mediumAlerts,
          lowAlerts,
          activeAlerts,
          resolvedAlerts,
          routeDeviationAlerts,
          recentAlerts: alerts.slice(0, 10)
        },
        auditLogs: driverAuditLogs.slice(0, 15),
        shipments: shipments.map(s => ({
          _id: s._id,
          shipmentId: s.shipmentId,
          goodsType: s.goodsType,
          quantity: s.quantity,
          unit: s.unit,
          pickup: s.pickup?.locationName || 'N/A',
          destination: s.destination?.locationName || 'N/A',
          vehicleNumber: s.assignedVehicle?.registrationNumber || s.vehicleNumber || 'NOT SPECIFIED',
          selectedRouteName: s.selectedRoute?.name || 'N/A',
          status: s.status,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          distanceKm: s.selectedRoute?.distanceKm || 0,
          estimatedDurationMinutes: s.selectedRoute?.estimatedDurationMinutes || 0,
          actualDeliveryTime: s.status === 'DELIVERED' ? (s.updatedAt || s.createdAt) : null
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get High-level operational overview report summary
// @route   GET /api/reports/overview
// @access  Private
exports.getOverviewReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);

    // Shipments overview
    const shipmentsTotal = await Shipment.countDocuments({ ...dateFilter, ...scope.shipments });
    const shipmentsActive = await Shipment.countDocuments({ 
      status: { $in: ['IN_TRANSIT', 'ROUTE_SELECTED', 'ROUTE_PENDING', 'AT_RISK', 'DELAYED', 'CREATED'] },
      ...dateFilter,
      ...scope.shipments
    });
    const shipmentsDelivered = await Shipment.countDocuments({ status: 'DELIVERED', ...dateFilter, ...scope.shipments });
    const shipmentsDelayed = await Shipment.countDocuments({ status: 'DELAYED', ...dateFilter, ...scope.shipments });
    const shipmentsAtRisk = await Shipment.countDocuments({ status: 'AT_RISK', ...dateFilter, ...scope.shipments });

    // Orders overview
    const ordersTotal = await Order.countDocuments({ ...dateFilter, ...scope.orders });
    const ordersPending = await Order.countDocuments({ status: 'PENDING', ...dateFilter, ...scope.orders });
    const ordersConverted = await Order.countDocuments({ assignedShipment: { $exists: true, $ne: null }, ...dateFilter, ...scope.orders });

    // Vehicles overview
    const vehiclesTotal = await Vehicle.countDocuments(scope.vehicles);
    const vehiclesActive = await Vehicle.countDocuments({ currentStatus: { $in: ['IN_TRANSIT', 'ASSIGNED'] }, ...scope.vehicles });
    const vehiclesAvailable = await Vehicle.countDocuments({ currentStatus: 'AVAILABLE', ...scope.vehicles });
    const vehiclesMaintenance = await Vehicle.countDocuments({ currentStatus: 'MAINTENANCE', ...scope.vehicles });

    // Routes overview (from shipments with selectedRoute)
    const routesActive = await Shipment.countDocuments({
      'selectedRoute.name': { $exists: true, $ne: null },
      status: { $in: ['IN_TRANSIT', 'ROUTE_SELECTED'] },
      ...dateFilter,
      ...scope.shipments
    });

    // Unresolved alerts
    const alertsActive = await Alert.countDocuments({ status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const alertsCritical = await Alert.countDocuments({ severity: 'CRITICAL', status: { $ne: 'RESOLVED' }, ...dateFilter, ...scope.alerts });

    // Rates
    const deliveryCompletionRate = shipmentsTotal > 0 ? parseFloat(((shipmentsDelivered / shipmentsTotal) * 100).toFixed(1)) : 0;
    const vehicleUtilizationRate = vehiclesTotal > 0 ? parseFloat(((vehiclesActive / vehiclesTotal) * 100).toFixed(1)) : 0;
    const orderConversionRate = ordersTotal > 0 ? parseFloat(((ordersConverted / ordersTotal) * 100).toFixed(1)) : 0;

    // Route Safety & Hazard Metrics derived from Shipments with selectedRoute
    const shipmentsWithRoute = await Shipment.find({
      'selectedRoute.name': { $exists: true, $ne: null },
      ...dateFilter,
      ...scope.shipments
    });

    let totalSafetyScore = 0;
    let lowRiskRoutes = 0;
    let moderateRiskRoutes = 0;
    let highRiskRoutes = 0;
    let criticalRiskRoutes = 0;
    let heavyRainAffected = 0;
    let floodRiskAffected = 0;
    let landslideRiskAffected = 0;
    let stormRiskAffected = 0;
    let highWindAffected = 0;
    let poorVisibilityAffected = 0;

    shipmentsWithRoute.forEach((s) => {
      const sr = s.selectedRoute;
      const score = typeof sr.safetyScore === 'number' ? sr.safetyScore : (100 - (sr.riskScore || 20));
      totalSafetyScore += score;
      const level = (sr.riskLevel || 'LOW').toUpperCase();

      if (level === 'CRITICAL' || score < 30) criticalRiskRoutes++;
      else if (level === 'HIGH' || score < 60) highRiskRoutes++;
      else if (level === 'MEDIUM' || level === 'MODERATE' || score < 80) moderateRiskRoutes++;
      else lowRiskRoutes++;

      let envData = null;
      if (sr && sr.coordinates && sr.coordinates.length > 0) {
        try {
          envData = getRouteEnvironmentalRisk(sr);
        } catch (e) {
          // ignore sampling error
        }
      }

      const rfStr = JSON.stringify(sr.riskFactors || []).toLowerCase();

      // Heavy Rain
      if (
        sr.weatherRisk?.hasHeavyRain ||
        (sr.weatherRisk?.maxRainfall && sr.weatherRisk.maxRainfall > 5) ||
        rfStr.includes('rain') || rfStr.includes('monsoon') || rfStr.includes('downpour') ||
        (envData && envData.rainfall && envData.rainfall.score > 25)
      ) {
        heavyRainAffected++;
      }

      // Flood Risk
      if (
        sr.hazardAnalysis?.floodRisk ||
        rfStr.includes('flood') || rfStr.includes('waterlog') || rfStr.includes('inundated') ||
        (envData && envData.flood && envData.flood.score > 30)
      ) {
        floodRiskAffected++;
      }

      // Landslide Risk
      if (
        sr.hazardAnalysis?.landslideRisk ||
        rfStr.includes('landslide') || rfStr.includes('mudslide') || rfStr.includes('rockfall') ||
        (envData && envData.landslide && envData.landslide.score > 30)
      ) {
        landslideRiskAffected++;
      }

      // Storm Risk
      if (
        sr.hazardAnalysis?.stormRisk ||
        rfStr.includes('storm') || rfStr.includes('thunder') || rfStr.includes('cyclone') ||
        (envData && envData.samples && envData.samples.some(samp => (samp.weather?.condition || '').toLowerCase().includes('storm')))
      ) {
        stormRiskAffected++;
      }

      // High Wind
      if (
        (sr.weatherRisk?.maxWindSpeed && sr.weatherRisk.maxWindSpeed > 15) ||
        rfStr.includes('wind') || rfStr.includes('gale') ||
        (envData && envData.samples && envData.samples.some(samp => (samp.weather?.windspeed || 0) > 15))
      ) {
        highWindAffected++;
      }

      // Poor Visibility
      if (
        (sr.weatherRisk?.visibility && sr.weatherRisk.visibility < 5000) ||
        rfStr.includes('visibility') || rfStr.includes('fog') || rfStr.includes('smog') ||
        (envData && envData.visibility && envData.visibility.score > 30)
      ) {
        poorVisibilityAffected++;
      }
    });

    const averageSafetyScore = shipmentsWithRoute.length > 0 ? Math.round(totalSafetyScore / shipmentsWithRoute.length) : 85;

    // Top High-Risk Active Shipments
    const topHighRiskShipments = await Shipment.find({
      status: { $in: ['IN_TRANSIT', 'ROUTE_SELECTED', 'AT_RISK', 'DELAYED'] },
      'selectedRoute.name': { $exists: true, $ne: null },
      ...scope.shipments
    })
      .sort({ 'selectedRoute.riskScore': -1, 'selectedRoute.safetyScore': 1 })
      .limit(5);

    // Recent Alerts
    const recentAlerts = await Alert.find({ ...dateFilter, ...scope.alerts })
      .populate('relatedShipment', 'shipmentId status')
      .sort({ createdAt: -1 })
      .limit(5);

    // Audit logs
    // Audit logs query from AuditLog collection + real stored Alert history
    const AuditLog = require('../models/AuditLog');
    const dbAuditLogs = await AuditLog.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(20);

    const recentAuditLogs = dbAuditLogs.map((a) => ({
      timestamp: a.createdAt,
      user: a.userName || 'System Auto-Engine',
      role: a.role || 'SYSTEM',
      action: a.action,
      module: a.module,
      reference: a.referenceId || 'LOG',
      description: a.description,
      status: a.status || 'SUCCESS'
    }));

    // Fallback: Add real stored Alert history
    if (recentAuditLogs.length < 10) {
      const alertsWithHistory = await Alert.find({ ...scope.alerts })
        .populate('history.performedBy', 'name email role')
        .sort({ updatedAt: -1 })
        .limit(10);

      alertsWithHistory.forEach((a) => {
        if (a.history && a.history.length > 0) {
          a.history.forEach((h) => {
            recentAuditLogs.push({
              timestamp: h.timestamp,
              user: h.performedBy?.name || 'System Auto-Engine',
              role: h.performedBy?.role || 'SYSTEM',
              action: h.action,
              module: 'ALERTS',
              reference: a.alertId,
              description: h.notes || `Alert ${a.alertId} updated`,
              status: 'SUCCESS'
            });
          });
        }
      });
    }

    recentAuditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalShipments: shipmentsTotal,
          activeShipments: shipmentsActive,
          deliveredShipments: shipmentsDelivered,
          delayedShipments: shipmentsDelayed,
          atRiskShipments: shipmentsAtRisk,
          deliveryCompletionRate,
          totalOrders: ordersTotal,
          pendingOrders: ordersPending,
          convertedOrders: ordersConverted,
          orderConversionRate,
          totalVehicles: vehiclesTotal,
          activeVehicles: vehiclesActive,
          availableVehicles: vehiclesAvailable,
          maintenanceVehicles: vehiclesMaintenance,
          vehicleUtilizationRate,
          activeRoutes: routesActive,
          unresolvedAlerts: alertsActive,
          criticalAlerts: alertsCritical,
          averageSafetyScore,
          lowRiskRoutes,
          moderateRiskRoutes,
          highRiskRoutes,
          criticalRiskRoutes,
          environmentalImpact: {
            totalEvaluatedShipments: shipmentsWithRoute.length,
            affectedCount: heavyRainAffected + floodRiskAffected + stormRiskAffected + landslideRiskAffected + highWindAffected + poorVisibilityAffected,
            heavyRain: heavyRainAffected,
            floodRisk: floodRiskAffected,
            landslideRisk: landslideRiskAffected,
            stormRisk: stormRiskAffected,
            highWind: highWindAffected,
            poorVisibility: poorVisibilityAffected,
            lastUpdated: new Date().toISOString(),
            status: 'LIVE'
          },
          auditLogs: recentAuditLogs.slice(0, 10)
        },
        topHighRiskShipments,
        recentAlerts,
        auditLogs: recentAuditLogs.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed shipments report data and records
// @route   GET /api/reports/shipments
// @access  Private
exports.getShipmentReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status } = req.query;

    const queryFilter = { ...dateFilter, ...scope.shipments };
    if (status && status !== '') {
      queryFilter.status = status;
    }

    const shipmentsTotal = await Shipment.countDocuments({ ...dateFilter, ...scope.shipments });
    const shipmentsDelivered = await Shipment.countDocuments({ status: 'DELIVERED', ...dateFilter, ...scope.shipments });
    const shipmentsDelayed = await Shipment.countDocuments({ status: 'DELAYED', ...dateFilter, ...scope.shipments });
    const shipmentsInTransit = await Shipment.countDocuments({ status: 'IN_TRANSIT', ...dateFilter, ...scope.shipments });
    const shipmentsPending = await Shipment.countDocuments({ status: 'CREATED', ...dateFilter, ...scope.shipments });

    const statusCounts = await Shipment.aggregate([
      { $match: { ...dateFilter, ...scope.shipments } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const records = await Shipment.find(queryFilter)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: shipmentsTotal,
          delivered: shipmentsDelivered,
          delayed: shipmentsDelayed,
          inTransit: shipmentsInTransit,
          pending: shipmentsPending,
          statusBreakdown: statusCounts
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed orders report data and records
// @route   GET /api/reports/orders
// @access  Private
exports.getOrderReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status } = req.query;

    const queryFilter = { ...dateFilter, ...scope.orders };
    if (status && status !== '') {
      queryFilter.status = status;
    }

    const ordersTotal = await Order.countDocuments({ ...dateFilter, ...scope.orders });
    const ordersPending = await Order.countDocuments({ status: 'PENDING', ...dateFilter, ...scope.orders });
    const ordersAssigned = await Order.countDocuments({ status: 'ASSIGNED', ...dateFilter, ...scope.orders });
    const ordersCompleted = await Order.countDocuments({ status: 'DELIVERED', ...dateFilter, ...scope.orders });

    const statusCounts = await Order.aggregate([
      { $match: { ...dateFilter, ...scope.orders } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const records = await Order.find(queryFilter)
      .populate('createdBy', 'name email')
      .populate('assignedShipment', 'shipmentId status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: ordersTotal,
          pending: ordersPending,
          assigned: ordersAssigned,
          completed: ordersCompleted,
          statusBreakdown: statusCounts
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed vehicle usage report data and records
// @route   GET /api/reports/vehicles
// @access  Private
exports.getVehicleReport = async (req, res, next) => {
  try {
    const scope = await buildRoleScope(req.user);
    const { status } = req.query;

    const queryFilter = { ...scope.vehicles };
    if (status && status !== '') {
      queryFilter.currentStatus = status;
    }

    const total = await Vehicle.countDocuments(scope.vehicles);
    const available = await Vehicle.countDocuments({ currentStatus: 'AVAILABLE', ...scope.vehicles });
    const assigned = await Vehicle.countDocuments({ currentStatus: { $in: ['ASSIGNED', 'IN_TRANSIT'] }, ...scope.vehicles });
    const maintenance = await Vehicle.countDocuments({ currentStatus: 'MAINTENANCE', ...scope.vehicles });

    const records = await Vehicle.find(queryFilter)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          available,
          assigned,
          maintenance
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed routes report data and records from Shipment.selectedRoute
// @route   GET /api/reports/routes
// @access  Private
exports.getRouteReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status, riskLevel } = req.query;

    const queryFilter = {
      'selectedRoute.name': { $exists: true, $ne: null },
      ...dateFilter,
      ...scope.shipments
    };

    if (status && status !== '') {
      queryFilter.status = status;
    }

    const shipmentsWithRoute = await Shipment.find(queryFilter)
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email')
      .sort({ updatedAt: -1 });

    let total = shipmentsWithRoute.length;
    let lowRiskCount = 0;
    let moderateRiskCount = 0;
    let highRiskCount = 0;
    let criticalRiskCount = 0;
    let totalDist = 0;
    let totalDur = 0;
    let totalSafety = 0;

    const records = shipmentsWithRoute.map((s) => {
      const sr = s.selectedRoute;
      const dist = sr.distanceKm || 0;
      const dur = sr.estimatedDurationMinutes || 0;
      const safety = typeof sr.safetyScore === 'number' ? sr.safetyScore : (100 - (sr.riskScore || 20));
      const level = (sr.riskLevel || 'LOW').toUpperCase();

      totalDist += dist;
      totalDur += dur;
      totalSafety += safety;

      if (level === 'CRITICAL' || safety < 30) criticalRiskCount++;
      else if (level === 'HIGH' || safety < 60) highRiskCount++;
      else if (level === 'MEDIUM' || level === 'MODERATE' || safety < 80) moderateRiskCount++;
      else lowRiskCount++;

      return {
        _id: s._id,
        shipmentId: s.shipmentId,
        goodsType: s.goodsType,
        corridorId: sr.routeId || `RT-${s.shipmentId}`,
        name: sr.name || 'Selected Route Corridor',
        routeName: sr.name || 'Selected Route Corridor',
        origin: s.pickup?.locationName || 'Pickup Node',
        destination: s.destination?.locationName || 'Destination Node',
        distance: dist,
        distanceKm: dist,
        estimatedDuration: dur,
        durationMinutes: dur,
        safetyScore: safety,
        riskScore: sr.riskScore || (100 - safety),
        riskLevel: level,
        riskFactors: sr.riskFactors || [],
        weatherRisk: sr.weatherRisk || {},
        hazardAnalysis: sr.hazardAnalysis || {},
        routeStatus: s.status === 'IN_TRANSIT' ? 'ACTIVE' : s.status === 'DELIVERED' ? 'COMPLETED' : 'PLANNED',
        createdAt: sr.selectedAt || s.createdAt || new Date()
      };
    });

    let filteredRecords = records;
    if (riskLevel && riskLevel !== '') {
      filteredRecords = records.filter(r => r.riskLevel === riskLevel.toUpperCase());
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          active: records.filter(r => r.routeStatus === 'ACTIVE').length,
          completed: records.filter(r => r.routeStatus === 'COMPLETED').length,
          planned: records.filter(r => r.routeStatus === 'PLANNED').length,
          lowRisk: lowRiskCount,
          moderateRisk: moderateRiskCount,
          highRisk: highRiskCount,
          criticalRisk: criticalRiskCount,
          averageDistanceKm: total > 0 ? parseFloat((totalDist / total).toFixed(1)) : 0,
          averageDurationMinutes: total > 0 ? Math.round(totalDur / total) : 0,
          averageSafetyScore: total > 0 ? Math.round(totalSafety / total) : 85
        },
        records: filteredRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed risk alerts report data and records
// @route   GET /api/reports/alerts
// @access  Private
exports.getAlertReport = async (req, res, next) => {
  try {
    const dateFilter = buildReportDateFilter(req);
    const scope = await buildRoleScope(req.user);
    const { status, severity } = req.query;

    const queryFilter = { ...dateFilter, ...scope.alerts };
    if (status && status !== '') {
      queryFilter.status = status;
    }
    if (severity && severity !== '') {
      queryFilter.severity = severity;
    }

    const total = await Alert.countDocuments({ ...dateFilter, ...scope.alerts });
    const active = await Alert.countDocuments({ status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const resolved = await Alert.countDocuments({ status: 'RESOLVED', ...dateFilter, ...scope.alerts });
    const critical = await Alert.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const high = await Alert.countDocuments({ severity: 'HIGH', status: 'ACTIVE', ...dateFilter, ...scope.alerts });

    const severityCounts = await Alert.aggregate([
      { $match: { ...dateFilter, ...scope.alerts } },
      { $group: { _id: "$severity", count: { $sum: 1 } } }
    ]);

    const records = await Alert.find(queryFilter)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('relatedShipment', 'shipmentId status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          active,
          resolved,
          critical,
          high,
          severityBreakdown: severityCounts
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed NGO operational report metrics
// @route   GET /api/reports/ngo
// @access  Private (NGO/Admin)
exports.getNgoReport = async (req, res, next) => {
  try {
    const ngoId = req.user._id;
    const dateFilter = buildReportDateFilter(req);

    // 1. Fetch Orders created or requested by this NGO (Schema uses createdBy for user ID)
    const orderQuery = {
      $or: [
        { createdBy: ngoId },
        { requestedBy: ngoId }
      ],
      ...dateFilter
    };

    const ngoOrders = await Order.find(orderQuery)
      .populate('assignedShipment', 'shipmentId status liveLocation selectedRoute assignedDriver assignedVehicle')
      .sort({ createdAt: -1 });

    const totalOrders = ngoOrders.length;
    const pendingOrders = ngoOrders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)).length;
    const inProgressOrders = ngoOrders.filter(o => ['ASSIGNED', 'IN_TRANSIT'].includes(o.status)).length;
    const completedOrders = ngoOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length;
    const cancelledOrders = ngoOrders.filter(o => o.status === 'CANCELLED').length;
    const approvedOrders = ngoOrders.filter(o => ['CONFIRMED', 'PROCESSING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(o.status)).length;

    // 2. Fetch linked Shipments for this NGO's orders or requested by NGO
    const ngoOrderIds = ngoOrders.map(o => o._id);
    const ngoOrderStringIds = ngoOrders.map(o => o._id.toString());
    const ngoOrderCodes = ngoOrders.map(o => o.orderId).filter(Boolean);

    const shipmentQuery = {
      $or: [
        { requestedBy: ngoId },
        { createdBy: ngoId },
        { assignedOrder: { $in: ngoOrderIds } },
        { orderId: { $in: ngoOrderCodes } }
      ],
      ...dateFilter
    };

    const ngoShipments = await Shipment.find(shipmentQuery)
      .populate('assignedOrder', 'orderId status cargoDescription')
      .populate('assignedDriver', 'name email phone')
      .populate('assignedVehicle', 'registrationNumber vehicleType capacity currentStatus')
      .sort({ updatedAt: -1 });

    const totalShipments = ngoShipments.length;
    const activeShipments = ngoShipments.filter(s => s.status === 'IN_TRANSIT').length;
    const deliveredShipments = ngoShipments.filter(s => s.status === 'DELIVERED').length;
    const pendingShipments = ngoShipments.filter(s => ['CREATED', 'ROUTE_PENDING', 'ROUTE_SELECTED'].includes(s.status)).length;
    const delayedShipments = ngoShipments.filter(s => s.status === 'DELAYED' || s.status === 'AT_RISK').length;
    const cancelledShipments = ngoShipments.filter(s => s.status === 'CANCELLED').length;

    // Order -> Shipment conversion stats
    const convertedToShipmentsCount = ngoOrders.filter(o => {
      if (o.assignedShipment) return true;
      return ngoShipments.some(s => 
        (s.assignedOrder && s.assignedOrder._id && s.assignedOrder._id.toString() === o._id.toString()) ||
        (s.assignedOrder && s.assignedOrder.toString() === o._id.toString()) ||
        (s.orderId && s.orderId === o.orderId)
      );
    }).length;
    const pendingConversionCount = Math.max(0, totalOrders - convertedToShipmentsCount);

    // Completion & On-Time Rates
    const completionRate = totalOrders > 0 
      ? Math.round((completedOrders / totalOrders) * 100) 
      : (totalShipments > 0 ? Math.round((deliveredShipments / totalShipments) * 100) : 0);
    const onTimeDeliveries = Math.max(0, deliveredShipments - delayedShipments);
    const onTimeDeliveryRate = deliveredShipments > 0 ? Math.round((onTimeDeliveries / deliveredShipments) * 100) : 100;

    // Calculate Average Delivery Time (minutes)
    let totalDurationMins = 0;
    let deliveredCount = 0;
    ngoShipments.forEach(s => {
      if (s.status === 'DELIVERED' && s.createdAt && (s.actualDeliveryTime || s.updatedAt)) {
        const start = new Date(s.createdAt);
        const end = new Date(s.actualDeliveryTime || s.updatedAt);
        const duration = Math.max(0, Math.round((end - start) / (1000 * 60)));
        totalDurationMins += duration;
        deliveredCount++;
      }
    });
    const averageDeliveryTimeMinutes = deliveredCount > 0 ? Math.round(totalDurationMins / deliveredCount) : 0;

    // 3. Fetch Alerts relevant to this NGO's orders/shipments
    const ngoShipmentIds = ngoShipments.map(s => s._id);
    const alertQuery = {
      $or: [
        { requestedBy: ngoId },
        { reportedBy: ngoId },
        { relatedShipment: { $in: ngoShipmentIds } },
        { relatedOrder: { $in: ngoOrderIds } }
      ],
      ...dateFilter
    };

    const ngoAlerts = await Alert.find(alertQuery)
      .populate('relatedShipment', 'shipmentId status')
      .sort({ createdAt: -1 });

    const totalAlerts = ngoAlerts.length;
    const activeAlerts = ngoAlerts.filter(a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED').length;
    const resolvedAlerts = ngoAlerts.filter(a => a.status === 'RESOLVED').length;
    const criticalAlerts = ngoAlerts.filter(a => a.severity === 'CRITICAL').length;
    const highAlerts = ngoAlerts.filter(a => a.severity === 'HIGH').length;
    const mediumAlerts = ngoAlerts.filter(a => a.severity === 'MEDIUM').length;
    const lowAlerts = ngoAlerts.filter(a => a.severity === 'LOW').length;

    // Active Shipment Spotlight
    const activeShipmentObj = ngoShipments.find(s => s.status === 'IN_TRANSIT') || ngoShipments[0] || null;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders,
          activeOrders: pendingOrders + inProgressOrders,
          completedOrders,
          totalShipments,
          activeShipments,
          deliveredShipments,
          activeAlerts,
          completionRate,
          onTimeDeliveryRate,
          averageDeliveryTimeMinutes
        },
        orderPerformance: {
          totalOrders,
          pendingOrders,
          approvedOrders,
          inProgressOrders,
          completedOrders,
          cancelledOrders,
          convertedToShipmentsCount,
          pendingConversionCount
        },
        deliveryPerformance: {
          totalShipments,
          deliveredShipments,
          activeShipments,
          pendingShipments,
          delayedShipments,
          cancelledShipments,
          completionRate,
          onTimeDeliveryRate,
          averageDeliveryTimeMinutes
        },
        alertSummary: {
          totalAlerts,
          activeAlerts,
          resolvedAlerts,
          criticalAlerts,
          highAlerts,
          mediumAlerts,
          lowAlerts
        },
        activeShipment: activeShipmentObj ? {
          shipmentId: activeShipmentObj.shipmentId,
          orderId: activeShipmentObj.assignedOrder?.orderId || activeShipmentObj.orderId || 'N/A',
          origin: activeShipmentObj.pickup?.locationName || 'N/A',
          destination: activeShipmentObj.destination?.locationName || 'N/A',
          selectedRoute: activeShipmentObj.selectedRoute?.name || 'No Route Selected',
          driverName: activeShipmentObj.assignedDriver?.name || 'Unassigned',
          driverPhone: activeShipmentObj.assignedDriver?.phone || 'N/A',
          vehicleReg: activeShipmentObj.assignedVehicle?.registrationNumber || 'Unassigned',
          status: activeShipmentObj.status,
          remainingDistanceKm: activeShipmentObj.status === 'DELIVERED' ? 0 : (activeShipmentObj.remainingDistanceKm ?? activeShipmentObj.selectedRoute?.distanceKm ?? 0),
          estimatedTimeRemainingMin: activeShipmentObj.status === 'DELIVERED' ? 0 : (activeShipmentObj.estimatedTimeRemainingMin ?? activeShipmentObj.selectedRoute?.estimatedDurationMinutes ?? activeShipmentObj.selectedRoute?.estimatedDurationMin ?? 0),
          liveLocation: activeShipmentObj.liveLocation || null
        } : null,
        myOrders: ngoOrders.map(o => {
          const linked = ngoShipments.find(s => 
            (s.assignedOrder && s.assignedOrder._id && s.assignedOrder._id.toString() === o._id.toString()) ||
            (s.assignedOrder && s.assignedOrder.toString() === o._id.toString()) ||
            (s.orderId && s.orderId === o.orderId)
          ) || o.assignedShipment;

          const pickupName = o.pickupLocation?.locationName || (typeof o.pickupLocation === 'string' ? o.pickupLocation : 'N/A');
          const deliveryName = o.deliveryLocation?.locationName || (typeof o.deliveryLocation === 'string' ? o.deliveryLocation : 'N/A');

          return {
            _id: o._id,
            orderId: o.orderId,
            itemDescription: o.cargoDescription || o.customerName || 'Relief Supplies',
            quantity: o.quantity ? `${o.quantity} ${o.weight ? 'KG (' + o.weight + ' T)' : 'KG'}` : 'N/A',
            pickupLocation: pickupName,
            deliveryLocation: deliveryName,
            status: o.status,
            linkedShipmentId: linked ? (linked.shipmentId || linked) : 'Pending Conversion',
            createdAt: o.createdAt,
            expectedDeliveryDate: o.requestedDeliveryDate || o.expectedDeliveryDate || null,
            actualDeliveryDate: (o.status === 'DELIVERED' || o.status === 'COMPLETED') ? o.updatedAt : null
          };
        }),
        shipments: ngoShipments.map(s => ({
          _id: s._id,
          shipmentId: s.shipmentId,
          orderId: s.assignedOrder?.orderId || s.orderId || 'N/A',
          origin: s.pickup?.locationName || 'N/A',
          destination: s.destination?.locationName || 'N/A',
          selectedRoute: s.selectedRoute?.name || 'Standard Corridor',
          driverName: s.assignedDriver?.name || 'Unassigned',
          vehicleReg: s.assignedVehicle?.registrationNumber || 'Unassigned',
          status: s.status,
          totalDistanceKm: s.selectedRoute?.distanceKm || 0,
          remainingDistanceKm: s.status === 'DELIVERED' ? 0 : (s.remainingDistanceKm ?? s.selectedRoute?.distanceKm ?? 0),
          etaMinutes: s.status === 'DELIVERED' ? 0 : (s.estimatedTimeRemainingMin ?? s.selectedRoute?.estimatedDurationMinutes ?? s.selectedRoute?.estimatedDurationMin ?? 0),
          updatedAt: s.updatedAt
        })),
        routes: ngoShipments.map(s => ({
          shipmentId: s.shipmentId,
          routeName: s.selectedRoute?.name || 'Standard Corridor',
          origin: s.pickup?.locationName || 'N/A',
          destination: s.destination?.locationName || 'N/A',
          totalDistanceKm: s.selectedRoute?.distanceKm || 0,
          remainingDistanceKm: s.status === 'DELIVERED' ? 0 : (s.remainingDistanceKm ?? s.selectedRoute?.distanceKm ?? 0),
          etaMinutes: s.status === 'DELIVERED' ? 0 : (s.estimatedTimeRemainingMin ?? s.selectedRoute?.estimatedDurationMinutes ?? s.selectedRoute?.estimatedDurationMin ?? 0),
          status: s.status
        })),
        alerts: ngoAlerts.map(a => ({
          _id: a._id,
          alertId: a.alertId || a._id,
          severity: a.severity,
          alertType: a.alertType,
          message: a.message || a.title || 'Safety Alert',
          shipmentId: a.relatedShipment?.shipmentId || 'N/A',
          location: a.locationName || a.location?.address || 'Corridor',
          timestamp: a.createdAt,
          status: a.status
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

