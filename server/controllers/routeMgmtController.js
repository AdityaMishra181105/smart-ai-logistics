const mongoose = require('mongoose');
const Route = require('../models/Route');
const Vehicle = require('../models/Vehicle');
const Shipment = require('../models/Shipment');
const { syncRouteAlerts } = require('../services/alerts/autoAlertService');

// Helper: check status transitions
const isValidTransition = (oldStatus, newStatus) => {
  const transitions = {
    PLANNED: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['IN_PROGRESS', 'PLANNED', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: []
  };
  return transitions[oldStatus]?.includes(newStatus) || oldStatus === newStatus;
};

// Helper: look up Route document by MongoDB _id, routeId, or linked Shipment ID
const findRouteDoc = async (idParam) => {
  if (!idParam) return null;
  const isMongoId = mongoose.Types.ObjectId.isValid(idParam);

  // 1. Try finding in Route collection by _id, routeId, or shipments array
  let route = await Route.findOne({
    $or: [
      ...(isMongoId ? [{ _id: idParam }, { shipments: idParam }] : []),
      { routeId: idParam }
    ]
  })
    .populate('assignedVehicle')
    .populate('shipments');

  if (route) return route;

  // 2. If not found in Route collection, check Shipment by _id or shipmentId
  const shipment = await Shipment.findOne({
    $or: [
      ...(isMongoId ? [{ _id: idParam }] : []),
      { shipmentId: idParam },
      { selectedRouteId: idParam },
      { 'selectedRoute.routeId': idParam }
    ]
  });

  if (shipment) {
    const routeId = shipment.selectedRoute?.routeId || shipment.selectedRouteId || `RT-${shipment.shipmentId}`;
    const routeName = shipment.selectedRoute?.name || 'Primary Transit Corridor';

    route = await Route.findOne({
      $or: [
        { routeId: routeId },
        { shipments: shipment._id }
      ]
    });

    if (!route) {
      route = await Route.create({
        routeId: routeId.startsWith('RT-') ? routeId : `RT-${shipment.shipmentId}`,
        routeName: routeName,
        origin: {
          locationName: shipment.pickup?.locationName || 'Pickup Origin',
          address: shipment.pickup?.address || '',
          coordinates: {
            latitude: shipment.pickup?.latitude || null,
            longitude: shipment.pickup?.longitude || null
          }
        },
        destination: {
          locationName: shipment.destination?.locationName || 'Destination Target',
          address: shipment.destination?.address || '',
          coordinates: {
            latitude: shipment.destination?.latitude || null,
            longitude: shipment.destination?.longitude || null
          }
        },
        distance: shipment.selectedRoute?.distanceKm || 0,
        estimatedDuration: shipment.selectedRoute?.estimatedDurationMinutes || 0,
        routeStatus: shipment.status === 'IN_TRANSIT' ? 'ACTIVE' : shipment.status === 'DELIVERED' ? 'COMPLETED' : 'PLANNED',
        shipments: [shipment._id],
        selectedRouteData: {
          routeId: shipment.selectedRoute?.routeId,
          routeName: shipment.selectedRoute?.name,
          coordinates: shipment.selectedRoute?.coordinates,
          distanceKm: shipment.selectedRoute?.distanceKm,
          durationMinutes: shipment.selectedRoute?.estimatedDurationMinutes,
          riskLevel: shipment.selectedRoute?.riskLevel,
          riskScore: shipment.selectedRoute?.riskScore,
          selectedAt: shipment.selectedRoute?.selectedAt
        }
      });
    }
    return route;
  }

  return null;
};

// @desc    Create new route
// @route   POST /api/routes
// @access  Private (ADMIN)
exports.createRoute = async (req, res, next) => {
  try {
    const {
      routeName,
      origin,
      destination,
      waypoints,
      distance,
      estimatedDuration,
      assignedVehicle,
      shipments
    } = req.body;

    if (!routeName || !origin || !destination || !distance || !estimatedDuration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: routeName, origin, destination, distance, estimatedDuration',
      });
    }

    const currentYear = new Date().getFullYear();
    const count = await Route.countDocuments({ routeId: new RegExp(`^RT-${currentYear}-`) });
    const nextNumber = String(count + 1).padStart(4, '0');
    const generatedRouteId = `RT-${currentYear}-${nextNumber}`;

    let vehicleId = null;
    if (assignedVehicle) {
      const vehicle = await Vehicle.findById(assignedVehicle);
      if (!vehicle) {
        return res.status(400).json({ success: false, message: 'Assigned vehicle not found.' });
      }
      if (['MAINTENANCE', 'INACTIVE'].includes(vehicle.currentStatus)) {
        return res.status(400).json({ success: false, message: `Cannot assign vehicle with status: ${vehicle.currentStatus}` });
      }
      vehicleId = vehicle._id;
    }

    let shipmentIds = [];
    if (shipments && shipments.length > 0) {
      const uniqueShipments = [...new Set(shipments)];
      for (const sId of uniqueShipments) {
        const shipment = await Shipment.findById(sId);
        if (!shipment) {
          return res.status(400).json({ success: false, message: `Shipment with ID ${sId} not found.` });
        }
        shipmentIds.push(shipment._id);
      }
    }

    const route = await Route.create({
      routeId: generatedRouteId,
      routeName,
      origin,
      destination,
      waypoints: waypoints || [],
      distance: parseFloat(distance),
      estimatedDuration: parseFloat(estimatedDuration),
      assignedVehicle: vehicleId,
      shipments: shipmentIds,
      routeStatus: 'PLANNED',
      statusHistory: [
        {
          previousStatus: 'PLANNED',
          newStatus: 'PLANNED',
          updatedBy: req.user.id,
          timestamp: new Date()
        }
      ]
    });

    const populatedRoute = await Route.findById(route._id)
      .populate('assignedVehicle', 'registrationNumber vehicleType currentStatus')
      .populate('shipments', 'shipmentId status priority destination goodsType');

    await syncRouteAlerts(populatedRoute, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: populatedRoute,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get all routes (merges explicit Route records & Shipment.selectedRoute records)
// @route   GET /api/routes
// @access  Private (Authenticated users)
exports.getRoutes = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.status) {
      query.routeStatus = req.query.status.toUpperCase();
    }
    if (req.query.vehicle) {
      query.assignedVehicle = req.query.vehicle;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { routeId: searchRegex },
        { routeName: searchRegex }
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const dbRoutes = await Route.find(query)
      .populate('assignedVehicle', 'registrationNumber vehicleType currentStatus')
      .populate('shipments', 'shipmentId status priority destination goodsType pickup')
      .sort({ createdAt: -1 });

    const coveredShipmentIds = new Set();
    dbRoutes.forEach(r => {
      if (r.shipments && r.shipments.length > 0) {
        r.shipments.forEach(s => {
          const sIdStr = s._id ? s._id.toString() : s.toString();
          coveredShipmentIds.add(sIdStr);
        });
      }
    });

    // Fetch shipments with selected routes stored in DB
    const shipmentsWithRoute = await Shipment.find({
      $or: [
        { 'selectedRoute.name': { $exists: true, $ne: null } },
        { 'selectedRoute.routeId': { $exists: true, $ne: null } },
        { selectedRouteId: { $exists: true, $ne: null } }
      ]
    })
      .populate('requestedBy', 'name email')
      .populate('assignedDriver', 'name email')
      .sort({ updatedAt: -1 });

    const virtualRoutes = [];
    for (const s of shipmentsWithRoute) {
      if (coveredShipmentIds.has(s._id.toString())) continue;

      let dbRoute = await Route.findOne({
        $or: [
          { routeId: s.selectedRoute?.routeId },
          { routeId: `RT-${s.shipmentId}` },
          { shipments: s._id }
        ]
      });

      if (!dbRoute) {
        dbRoute = await Route.create({
          routeId: s.selectedRoute?.routeId && s.selectedRoute.routeId.startsWith('RT-') ? s.selectedRoute.routeId : `RT-${s.shipmentId}`,
          routeName: s.selectedRoute?.name || 'Primary Transit Corridor',
          origin: {
            locationName: s.pickup?.locationName || 'Pickup Origin',
            address: s.pickup?.address || '',
            coordinates: {
              latitude: s.pickup?.latitude || null,
              longitude: s.pickup?.longitude || null
            }
          },
          destination: {
            locationName: s.destination?.locationName || 'Destination Target',
            address: s.destination?.address || '',
            coordinates: {
              latitude: s.destination?.latitude || null,
              longitude: s.destination?.longitude || null
            }
          },
          distance: s.selectedRoute?.distanceKm || 0,
          estimatedDuration: s.selectedRoute?.estimatedDurationMinutes || 0,
          routeStatus: s.status === 'IN_TRANSIT' ? 'ACTIVE' : s.status === 'DELIVERED' ? 'COMPLETED' : 'PLANNED',
          shipments: [s._id],
          selectedRouteData: {
            routeId: s.selectedRoute?.routeId,
            routeName: s.selectedRoute?.name,
            coordinates: s.selectedRoute?.coordinates,
            distanceKm: s.selectedRoute?.distanceKm,
            durationMinutes: s.selectedRoute?.estimatedDurationMinutes,
            riskLevel: s.selectedRoute?.riskLevel,
            riskScore: s.selectedRoute?.riskScore,
            selectedAt: s.selectedRoute?.selectedAt
          }
        });
      }

      virtualRoutes.push({
        _id: dbRoute._id,
        routeId: dbRoute.routeId,
        routeName: s.selectedRoute?.name || dbRoute.routeName,
        origin: {
          locationName: s.pickup?.locationName || 'Pickup Origin',
          address: s.pickup?.address || '',
          latitude: s.pickup?.latitude,
          longitude: s.pickup?.longitude
        },
        destination: {
          locationName: s.destination?.locationName || 'Destination Target',
          address: s.destination?.address || '',
          latitude: s.destination?.latitude,
          longitude: s.destination?.longitude
        },
        distance: s.selectedRoute?.distanceKm || dbRoute.distance || 0,
        estimatedDuration: s.selectedRoute?.estimatedDurationMinutes || dbRoute.estimatedDuration || 0,
        safetyScore: s.selectedRoute?.safetyScore || (100 - (s.selectedRoute?.riskScore || 20)),
        riskScore: s.selectedRoute?.riskScore || 20,
        riskLevel: s.selectedRoute?.riskLevel || 'LOW',
        riskFactors: s.selectedRoute?.riskFactors || [],
        weatherRisk: s.selectedRoute?.weatherRisk || {},
        hazardAnalysis: s.selectedRoute?.hazardAnalysis || {},
        coordinates: s.selectedRoute?.coordinates || dbRoute.selectedRouteData?.coordinates || [],
        routeStatus: dbRoute.routeStatus || (s.status === 'IN_TRANSIT' ? 'ACTIVE' : s.status === 'DELIVERED' ? 'COMPLETED' : 'PLANNED'),
        shipment: s,
        shipments: [s],
        shipmentId: s.shipmentId,
        goodsType: s.goodsType,
        priority: s.priority,
        assignedVehicle: dbRoute.assignedVehicle || (s.vehicleNumber ? { registrationNumber: s.vehicleNumber } : null),
        assignedDriver: s.assignedDriver,
        createdAt: s.selectedRoute?.selectedAt || s.updatedAt,
        isShipmentRoute: true
      });
    }

    const formattedDbRoutes = dbRoutes.map(r => {
      const s = r.shipments && r.shipments.length > 0 ? r.shipments[0] : null;
      const coords = (r.selectedRouteData?.coordinates && r.selectedRouteData.coordinates.length > 0)
        ? r.selectedRouteData.coordinates
        : (s?.selectedRoute?.coordinates && s.selectedRoute.coordinates.length > 0)
        ? s.selectedRoute.coordinates
        : (r.coordinates || []);

      return {
        _id: r._id,
        routeId: r.routeId,
        routeName: r.selectedRouteData?.routeName || r.routeName,
        origin: {
          locationName: r.origin?.locationName || s?.pickup?.locationName || 'Pickup Origin',
          address: r.origin?.address || s?.pickup?.address || '',
          latitude: r.origin?.coordinates?.latitude || s?.pickup?.latitude,
          longitude: r.origin?.coordinates?.longitude || s?.pickup?.longitude
        },
        destination: {
          locationName: r.destination?.locationName || s?.destination?.locationName || 'Destination Target',
          address: r.destination?.address || s?.destination?.address || '',
          latitude: r.destination?.coordinates?.latitude || s?.destination?.latitude,
          longitude: r.destination?.coordinates?.longitude || s?.destination?.longitude
        },
        distance: r.selectedRouteData?.distanceKm || r.distance || s?.selectedRoute?.distanceKm || 0,
        estimatedDuration: r.selectedRouteData?.durationMinutes || r.estimatedDuration || s?.selectedRoute?.estimatedDurationMinutes || 0,
        safetyScore: r.riskAnalysis?.score !== undefined ? (100 - r.riskAnalysis.score) : (s?.selectedRoute?.safetyScore || 80),
        riskScore: r.riskAnalysis?.score !== undefined ? r.riskAnalysis.score : (s?.selectedRoute?.riskScore || 20),
        riskLevel: r.riskAnalysis?.level || s?.selectedRoute?.riskLevel || 'LOW',
        riskFactors: r.riskAnalysis?.factors || s?.selectedRoute?.riskFactors || [],
        weatherRisk: s?.selectedRoute?.weatherRisk || {},
        hazardAnalysis: s?.selectedRoute?.hazardAnalysis || {},
        coordinates: coords,
        routeStatus: r.routeStatus,
        shipments: r.shipments,
        shipment: s,
        shipmentId: s?.shipmentId || r.routeId,
        assignedVehicle: r.assignedVehicle,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    });

    const combined = [...formattedDbRoutes, ...virtualRoutes];
    const total = combined.length;
    const paginated = combined.slice(startIndex, startIndex + limit);

    res.status(200).json({
      success: true,
      count: paginated.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      },
      data: paginated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assigned routes for logged in user (Driver, NGO, or Admin)
// @route   GET /api/routes/driver
// @access  Private (Driver / NGO / Authenticated users)
exports.getDriverRoutes = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const hasRouteCondition = {
      $or: [
        { 'selectedRoute.name': { $exists: true, $ne: null } },
        { 'selectedRoute.routeId': { $exists: true, $ne: null } },
        { selectedRouteId: { $exists: true, $ne: null } }
      ]
    };

    let query = hasRouteCondition;

    if (req.user.role !== 'ADMIN') {
      query = {
        $and: [
          hasRouteCondition,
          {
            $or: [
              { assignedDriver: userId },
              { requestedBy: userId }
            ]
          }
        ]
      };
    }

    const shipments = await Shipment.find(query)
      .populate('assignedDriver', 'name email')
      .populate('requestedBy', 'name email')
      .sort({ updatedAt: -1 });

    const routes = shipments.map((s) => ({
      _id: s._id,
      shipmentId: s.shipmentId,
      goodsType: s.goodsType,
      priority: s.priority,
      routeId: s.selectedRoute?.routeId || s.selectedRouteId || `RT-${s.shipmentId}`,
      routeName: s.selectedRoute?.name || 'Assigned Route Corridor',
      origin: {
        locationName: s.pickup?.locationName,
        address: s.pickup?.address,
        latitude: s.pickup?.latitude,
        longitude: s.pickup?.longitude
      },
      destination: {
        locationName: s.destination?.locationName,
        address: s.destination?.address,
        latitude: s.destination?.latitude,
        longitude: s.destination?.longitude
      },
      distanceKm: s.selectedRoute?.distanceKm || 0,
      estimatedDurationMinutes: s.selectedRoute?.estimatedDurationMinutes || 0,
      safetyScore: s.selectedRoute?.safetyScore || (100 - (s.selectedRoute?.riskScore || 20)),
      riskScore: s.selectedRoute?.riskScore || 20,
      riskLevel: s.selectedRoute?.riskLevel || 'LOW',
      riskFactors: s.selectedRoute?.riskFactors || [],
      weatherRisk: s.selectedRoute?.weatherRisk || {},
      hazardAnalysis: s.selectedRoute?.hazardAnalysis || {},
      coordinates: s.selectedRoute?.coordinates || [],
      status: s.status,
      vehicleNumber: s.vehicleNumber,
      assignedDriver: s.assignedDriver,
      selectedAt: s.selectedRoute?.selectedAt
    }));

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get route by ID
// @route   GET /api/routes/:id
// @access  Private (Authenticated users)
exports.getRouteById = async (req, res, next) => {
  try {
    const r = await findRouteDoc(req.params.id);

    if (!r) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    const s = r.shipments && r.shipments.length > 0 ? r.shipments[0] : (r.shipment || null);
    const coords = (r.selectedRouteData?.coordinates && Array.isArray(r.selectedRouteData.coordinates) && r.selectedRouteData.coordinates.length > 2)
      ? r.selectedRouteData.coordinates
      : (s?.selectedRoute?.coordinates && Array.isArray(s.selectedRoute.coordinates) && s.selectedRoute.coordinates.length > 2)
      ? s.selectedRoute.coordinates
      : (r.coordinates && Array.isArray(r.coordinates) && r.coordinates.length > 2)
      ? r.coordinates
      : [];

    const formattedRoute = {
      _id: r._id,
      routeId: r.routeId,
      routeName: r.selectedRouteData?.routeName || r.routeName,
      origin: {
        locationName: r.origin?.locationName || s?.pickup?.locationName || 'Pickup Origin',
        address: r.origin?.address || s?.pickup?.address || '',
        latitude: r.origin?.coordinates?.latitude || r.origin?.latitude || s?.pickup?.latitude,
        longitude: r.origin?.coordinates?.longitude || r.origin?.longitude || s?.pickup?.longitude
      },
      destination: {
        locationName: r.destination?.locationName || s?.destination?.locationName || 'Destination Target',
        address: r.destination?.address || s?.destination?.address || '',
        latitude: r.destination?.coordinates?.latitude || r.destination?.latitude || s?.destination?.latitude,
        longitude: r.destination?.coordinates?.longitude || r.destination?.longitude || s?.destination?.longitude
      },
      distance: r.selectedRouteData?.distanceKm || r.distance || s?.selectedRoute?.distanceKm || 0,
      estimatedDuration: r.selectedRouteData?.durationMinutes || r.estimatedDuration || s?.selectedRoute?.estimatedDurationMinutes || 0,
      safetyScore: r.riskAnalysis?.score !== undefined ? (100 - r.riskAnalysis.score) : (s?.selectedRoute?.safetyScore || 80),
      riskScore: r.riskAnalysis?.score !== undefined ? r.riskAnalysis.score : (s?.selectedRoute?.riskScore || 20),
      riskLevel: r.riskAnalysis?.level || s?.selectedRoute?.riskLevel || 'LOW',
      riskFactors: r.riskAnalysis?.factors || s?.selectedRoute?.riskFactors || [],
      weatherRisk: s?.selectedRoute?.weatherRisk || {},
      hazardAnalysis: s?.selectedRoute?.hazardAnalysis || {},
      coordinates: coords,
      selectedRouteData: r.selectedRouteData || s?.selectedRoute,
      routeStatus: r.routeStatus || 'PLANNED',
      shipments: r.shipments || [],
      shipment: s,
      shipmentId: s?.shipmentId || r.routeId,
      assignedVehicle: r.assignedVehicle,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };

    res.status(200).json({
      success: true,
      data: formattedRoute
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    next(error);
  }
};

// @desc    Update route details
// @route   PUT /api/routes/:id
// @access  Private (ADMIN)
exports.updateRoute = async (req, res, next) => {
  try {
    const {
      routeName,
      origin,
      destination,
      waypoints,
      distance,
      estimatedDuration,
      assignedVehicle,
      shipments
    } = req.body;

    const route = await findRouteDoc(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    if (routeName) route.routeName = routeName;
    if (origin) route.origin = origin;
    if (destination) route.destination = destination;
    if (waypoints) route.waypoints = waypoints;
    if (distance !== undefined) route.distance = parseFloat(distance);
    if (estimatedDuration !== undefined) route.estimatedDuration = parseFloat(estimatedDuration);

    if (assignedVehicle !== undefined) {
      if (assignedVehicle === null || assignedVehicle === '') {
        route.assignedVehicle = null;
      } else {
        const vehicle = await Vehicle.findById(assignedVehicle);
        if (!vehicle) {
          return res.status(400).json({ success: false, message: 'Assigned vehicle not found.' });
        }
        if (['MAINTENANCE', 'INACTIVE'].includes(vehicle.currentStatus)) {
          return res.status(400).json({ success: false, message: `Cannot assign vehicle with status: ${vehicle.currentStatus}` });
        }
        route.assignedVehicle = vehicle._id;

        if (route.shipments && route.shipments.length > 0) {
          await Shipment.updateMany(
            { _id: { $in: route.shipments } },
            { $set: { vehicleNumber: vehicle.registrationNumber } }
          );
        }
      }
    }

    if (shipments !== undefined) {
      if (shipments === null || shipments.length === 0) {
        route.shipments = [];
      } else {
        const uniqueShipments = [...new Set(shipments)];
        const shipmentIds = [];
        for (const sId of uniqueShipments) {
          const shipment = await Shipment.findById(sId);
          if (!shipment) {
            return res.status(400).json({ success: false, message: `Shipment with ID ${sId} not found.` });
          }
          shipmentIds.push(shipment._id);
        }
        route.shipments = shipmentIds;
      }
    }

    await route.save();
    const updatedRoute = await Route.findById(route._id)
      .populate('assignedVehicle')
      .populate('shipments');

    await syncRouteAlerts(updatedRoute, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Route details updated successfully',
      data: updatedRoute
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    next(error);
  }
};

// @desc    Update route status
// @route   PATCH /api/routes/:id/status
// @access  Private (ADMIN)
exports.updateRouteStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const route = await findRouteDoc(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    const newStatus = status.toUpperCase();
    if (!isValidTransition(route.routeStatus, newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid route status transition from ${route.routeStatus} to ${newStatus}.`
      });
    }

    const previousStatus = route.routeStatus;
    route.routeStatus = newStatus;
    
    route.statusHistory.push({
      previousStatus,
      newStatus,
      updatedBy: req.user.id,
      timestamp: new Date()
    });

    await route.save();
    await syncRouteAlerts(route, req.user.id);

    if (route.shipments && route.shipments.length > 0) {
      let targetShipmentStatus = null;
      if (newStatus === 'ACTIVE' || newStatus === 'IN_PROGRESS') targetShipmentStatus = 'IN_TRANSIT';
      else if (newStatus === 'COMPLETED') targetShipmentStatus = 'DELIVERED';
      else if (newStatus === 'PLANNED') targetShipmentStatus = 'ROUTE_SELECTED';
      else if (newStatus === 'CANCELLED') targetShipmentStatus = 'CANCELLED';

      if (targetShipmentStatus) {
        await Shipment.updateMany(
          { _id: { $in: route.shipments } },
          { $set: { status: targetShipmentStatus } }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Route status updated to ${newStatus}`,
      data: route
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign vehicle to route
// @route   POST /api/routes/:id/assign-vehicle
// @access  Private (ADMIN)
exports.assignVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) {
      return res.status(400).json({ success: false, message: 'vehicleId is required.' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(400).json({ success: false, message: 'Vehicle not found.' });
    }
    if (['MAINTENANCE', 'INACTIVE'].includes(vehicle.currentStatus)) {
      return res.status(400).json({ success: false, message: `Cannot assign vehicle with status: ${vehicle.currentStatus}` });
    }

    const route = await findRouteDoc(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    route.assignedVehicle = vehicle._id;
    await route.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle assigned to route successfully',
      data: route
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add shipments to route
// @route   POST /api/routes/:id/shipments
// @access  Private (ADMIN)
exports.addShipment = async (req, res, next) => {
  try {
    const { shipmentId } = req.body;
    if (!shipmentId) {
      return res.status(400).json({ success: false, message: 'shipmentId is required.' });
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(400).json({ success: false, message: 'Shipment not found.' });
    }

    const route = await findRouteDoc(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    if (route.shipments.includes(shipment._id)) {
      return res.status(400).json({ success: false, message: 'Shipment already exists on this route.' });
    }

    route.shipments.push(shipment._id);
    await route.save();

    res.status(200).json({
      success: true,
      message: 'Shipment added to route successfully',
      data: route
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove shipment from route
// @route   DELETE /api/routes/:id/shipments/:shipmentId
// @access  Private (ADMIN)
exports.removeShipment = async (req, res, next) => {
  try {
    const route = await findRouteDoc(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    const shipmentId = req.params.shipmentId;
    if (!route.shipments.includes(shipmentId)) {
      return res.status(400).json({ success: false, message: 'Shipment does not exist on this route.' });
    }

    route.shipments = route.shipments.filter(s => String(s) !== String(shipmentId));
    await route.save();

    res.status(200).json({
      success: true,
      message: 'Shipment removed from route successfully',
      data: route
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get route statistics
// @route   GET /api/routes/stats
// @access  Private (Authenticated users)
exports.getRouteStats = async (req, res, next) => {
  try {
    const total = await Route.countDocuments();
    const planned = await Route.countDocuments({ routeStatus: 'PLANNED' });
    const active = await Route.countDocuments({ routeStatus: 'ACTIVE' });
    const inProgress = await Route.countDocuments({ routeStatus: 'IN_PROGRESS' });
    const completed = await Route.countDocuments({ routeStatus: 'COMPLETED' });
    const cancelled = await Route.countDocuments({ routeStatus: 'CANCELLED' });

    res.status(200).json({
      success: true,
      data: {
        total,
        planned,
        active: active + inProgress,
        completed,
        cancelled
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private (ADMIN)
exports.deleteRoute = async (req, res, next) => {
  try {
    const route = await findRouteDoc(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    if (['ACTIVE', 'IN_PROGRESS'].includes(route.routeStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a route while it is active or in progress.'
      });
    }

    await Route.findByIdAndDelete(route._id);

    res.status(200).json({
      success: true,
      message: 'Route record deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    next(error);
  }
};
