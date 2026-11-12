const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Alert = require('../models/Alert');

// Helper to validate and parse startDate and endDate
const buildDateFilter = (req) => {
  const { startDate, endDate } = req.query;
  const filter = {};

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        const error = new Error('Invalid startDate query parameter format');
        error.statusCode = 400;
        throw error;
      }
      filter.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        const error = new Error('Invalid endDate query parameter format');
        error.statusCode = 400;
        throw error;
      }
      filter.createdAt.$lte = end;
    }
  }

  return filter;
};

// Helper for scope (ADMIN has full access)
const buildRoleScope = async (user) => {
  return {
    shipments: {},
    orders: {},
    vehicles: {},
    routes: {},
    alerts: {}
  };
};

// @desc    Get Overview operational analytics
// @route   GET /api/analytics/overview
// @access  Private
exports.getOverview = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req);
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

    // Orders overview
    const ordersTotal = await Order.countDocuments({ ...dateFilter, ...scope.orders });
    const ordersPending = await Order.countDocuments({ status: 'PENDING', ...dateFilter, ...scope.orders });
    const ordersCompleted = await Order.countDocuments({ status: 'DELIVERED', ...dateFilter, ...scope.orders });

    // Vehicles overview
    const vehiclesTotal = await Vehicle.countDocuments(scope.vehicles);
    const vehiclesAvailable = await Vehicle.countDocuments({ currentStatus: 'AVAILABLE', ...scope.vehicles });
    const vehiclesAssigned = await Vehicle.countDocuments({ currentStatus: { $in: ['ASSIGNED', 'IN_TRANSIT'] }, ...scope.vehicles });
    const vehiclesMaintenance = await Vehicle.countDocuments({ currentStatus: 'MAINTENANCE', ...scope.vehicles });

    // Routes overview
    const routesTotal = await Route.countDocuments({ ...dateFilter, ...scope.routes });
    const routesActive = await Route.countDocuments({ routeStatus: 'ACTIVE', ...dateFilter, ...scope.routes });
    const routesCompleted = await Route.countDocuments({ routeStatus: 'COMPLETED', ...dateFilter, ...scope.routes });

    // Alerts overview
    const alertsActive = await Alert.countDocuments({ status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const alertsCritical = await Alert.countDocuments({ status: 'ACTIVE', severity: 'CRITICAL', ...dateFilter, ...scope.alerts });
    const alertsHigh = await Alert.countDocuments({ status: 'ACTIVE', severity: 'HIGH', ...dateFilter, ...scope.alerts });
    const alertsResolved = await Alert.countDocuments({ status: 'RESOLVED', ...dateFilter, ...scope.alerts });

    res.status(200).json({
      success: true,
      data: {
        shipments: {
          total: shipmentsTotal,
          active: shipmentsActive,
          delivered: shipmentsDelivered,
          delayed: shipmentsDelayed
        },
        orders: {
          total: ordersTotal,
          pending: ordersPending,
          completed: ordersCompleted
        },
        vehicles: {
          total: vehiclesTotal,
          available: vehiclesAvailable,
          assigned: vehiclesAssigned,
          maintenance: vehiclesMaintenance
        },
        routes: {
          total: routesTotal,
          active: routesActive,
          completed: routesCompleted
        },
        alerts: {
          active: alertsActive,
          critical: alertsCritical,
          high: alertsHigh,
          resolved: alertsResolved
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed shipment performance analytics
// @route   GET /api/analytics/shipments
// @access  Private
exports.getShipmentAnalytics = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req);
    const scope = await buildRoleScope(req.user);

    // 1. Shipment counts by status
    const statusCounts = await Shipment.aggregate([
      { $match: { ...dateFilter, ...scope.shipments } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // 2. Shipments over time
    const overTime = await Shipment.aggregate([
      { $match: { ...dateFilter, ...scope.shipments } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Distribution by cargo categories
    const cargoCounts = await Shipment.aggregate([
      { $match: { ...dateFilter, ...scope.shipments } },
      { $group: { _id: "$goodsType", count: { $sum: 1 } } }
    ]);

    // 4. Region distribution (Top 8 destinations)
    const regions = await Shipment.aggregate([
      { $match: { ...dateFilter, ...scope.shipments } },
      { $group: { _id: "$destination.locationName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // 5. Avg duration for delivered
    const avgDuration = await Shipment.aggregate([
      { $match: { status: 'DELIVERED', ...dateFilter, ...scope.shipments } },
      { $project: {
          durationMinutes: {
            $divide: [ { $subtract: ["$updatedAt", "$createdAt"] }, 60000 ]
          }
        }
      },
      { $group: {
          _id: null,
          avgMinutes: { $avg: "$durationMinutes" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusCounts,
        overTime,
        cargoCounts,
        regions,
        averageDurationMinutes: avgDuration[0]?.avgMinutes ? Math.round(avgDuration[0].avgMinutes) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get delivery on-time performance analytics
// @route   GET /api/analytics/delivery-performance
// @access  Private
exports.getDeliveryPerformance = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req);
    const scope = await buildRoleScope(req.user);

    const shipments = await Shipment.find({
      status: 'DELIVERED',
      ...dateFilter,
      ...scope.shipments
    }).select('createdAt updatedAt selectedRoute');

    let onTimeCount = 0;
    let delayedCount = 0;
    let totalWithEstimates = 0;
    let totalDurationMinutes = 0;

    shipments.forEach(s => {
      const estimated = s.selectedRoute?.estimatedDurationMinutes;
      const actual = (s.updatedAt - s.createdAt) / 60000;
      totalDurationMinutes += actual;
      totalWithEstimates++;

      if (estimated) {
        if (actual <= estimated * 1.4) {
          onTimeCount++;
        } else {
          delayedCount++;
        }
      }
    });

    const onTimeRate = totalWithEstimates > 0 && onTimeCount + delayedCount > 0
      ? parseFloat(((onTimeCount / (onTimeCount + delayedCount)) * 100).toFixed(1))
      : null;
    const delayedRate = totalWithEstimates > 0 && onTimeCount + delayedCount > 0
      ? parseFloat(((delayedCount / (onTimeCount + delayedCount)) * 100).toFixed(1))
      : null;
    const averageDeliveryDuration = totalWithEstimates > 0
      ? Math.round(totalDurationMinutes / totalWithEstimates)
      : null;

    const trend = await Shipment.aggregate([
      { $match: { status: 'DELIVERED', ...dateFilter, ...scope.shipments } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          completed: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCompleted: shipments.length,
        onTimeRate,
        delayedRate,
        averageDurationMinutes: averageDeliveryDuration,
        trend
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vehicle utilization aggregates
// @route   GET /api/analytics/vehicles
// @access  Private
exports.getVehicleAnalytics = async (req, res, next) => {
  try {
    const scope = await buildRoleScope(req.user);

    const statusCounts = await Vehicle.aggregate([
      { $match: scope.vehicles },
      { $group: { _id: "$currentStatus", count: { $sum: 1 } } }
    ]);

    const total = await Vehicle.countDocuments(scope.vehicles);
    const assigned = await Vehicle.countDocuments({ currentStatus: { $in: ['ASSIGNED', 'IN_TRANSIT'] }, ...scope.vehicles });

    const fuelCounts = await Vehicle.aggregate([
      { $match: scope.vehicles },
      { $group: { _id: "$fuelType", count: { $sum: 1 } } }
    ]);

    const vehiclesWithAlerts = await Alert.aggregate([
      { $match: { status: 'ACTIVE', relatedVehicle: { $ne: null }, ...scope.alerts } },
      { $group: { _id: "$relatedVehicle", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalVehicles: total,
        assignedVehicles: assigned,
        utilizationRate: total > 0 ? parseFloat(((assigned / total) * 100).toFixed(1)) : 0,
        statusCounts,
        fuelCounts,
        alertedVehiclesCount: vehiclesWithAlerts.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get route analytics
// @route   GET /api/analytics/routes
// @access  Private
exports.getRouteAnalytics = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req);
    const scope = await buildRoleScope(req.user);

    const statusCounts = await Route.aggregate([
      { $match: { ...dateFilter, ...scope.routes } },
      { $group: { _id: "$routeStatus", count: { $sum: 1 } } }
    ]);

    const total = await Route.countDocuments({ ...dateFilter, ...scope.routes });

    const averages = await Route.aggregate([
      { $match: { ...dateFilter, ...scope.routes } },
      { $group: {
          _id: null,
          avgDistance: { $avg: "$distance" },
          avgDuration: { $avg: "$estimatedDuration" }
        }
      }
    ]);

    const hazardsCount = await Alert.countDocuments({
      alertType: 'CORRIDOR_HAZARD',
      status: 'ACTIVE',
      relatedRoute: { $ne: null },
      ...dateFilter,
      ...scope.alerts
    });

    res.status(200).json({
      success: true,
      data: {
        totalRoutes: total,
        statusCounts,
        averageDistanceKm: averages[0]?.avgDistance ? parseFloat(averages[0].avgDistance.toFixed(1)) : 0,
        averageDurationMinutes: averages[0]?.avgDuration ? Math.round(averages[0].avgDuration) : 0,
        hazardsCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alerts and risk metrics splits
// @route   GET /api/analytics/alerts
// @access  Private
exports.getAlertAnalytics = async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req);
    const scope = await buildRoleScope(req.user);

    const severityCounts = await Alert.aggregate([
      { $match: { ...dateFilter, ...scope.alerts } },
      { $group: { _id: "$severity", count: { $sum: 1 } } }
    ]);

    const statusCounts = await Alert.aggregate([
      { $match: { ...dateFilter, ...scope.alerts } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const typeCounts = await Alert.aggregate([
      { $match: { ...dateFilter, ...scope.alerts } },
      { $group: { _id: "$alertType", count: { $sum: 1 } } }
    ]);

    const criticalCount = await Alert.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE', ...dateFilter, ...scope.alerts });
    const highCount = await Alert.countDocuments({ severity: 'HIGH', status: 'ACTIVE', ...dateFilter, ...scope.alerts });

    const affectedShipments = await Alert.countDocuments({ status: 'ACTIVE', relatedShipment: { $ne: null }, ...dateFilter, ...scope.alerts });
    const affectedVehicles = await Alert.countDocuments({ status: 'ACTIVE', relatedVehicle: { $ne: null }, ...dateFilter, ...scope.alerts });
    const affectedRoutes = await Alert.countDocuments({ status: 'ACTIVE', relatedRoute: { $ne: null }, ...dateFilter, ...scope.alerts });

    res.status(200).json({
      success: true,
      data: {
        severityCounts,
        statusCounts,
        typeCounts,
        activeCriticalCount: criticalCount,
        activeHighCount: highCount,
        affectedShipments,
        affectedVehicles,
        affectedRoutes
      }
    });
  } catch (error) {
    next(error);
  }
};
