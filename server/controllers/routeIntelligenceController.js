const mongoose = require('mongoose');
const Route = require('../models/Route');
const { analyzeRouteIntelligence } = require('../services/aiRouteService');
const { geocodeLocation } = require('../services/geocodingService');

/**
 * Route Intelligence Controller
 * 
 * Provides AI-driven disaster-aware route analysis endpoints
 * - Generates alternative routes using real routing APIs
 * - Analyzes risk using real weather and incident data
 * - Recommends safest route using Gemini AI
 */

/**
 * Helper to find a route document by MongoDB _id, routeId string, or routeName
 */
const findRouteByIdOrName = async (idParam) => {
  if (!idParam) return null;

  let route = null;
  if (mongoose.Types.ObjectId.isValid(idParam)) {
    route = await Route.findById(idParam)
      .populate('shipments', 'goodsType priority')
      .populate('assignedVehicle', 'vehicleType');
  }

  if (!route) {
    route = await Route.findOne({ routeId: idParam })
      .populate('shipments', 'goodsType priority')
      .populate('assignedVehicle', 'vehicleType');
  }

  if (!route) {
    route = await Route.findOne({ routeName: idParam })
      .populate('shipments', 'goodsType priority')
      .populate('assignedVehicle', 'vehicleType');
  }

  return route;
};

/**
 * @desc    Analyze route with AI intelligence
 * @route   POST /api/routes/:id/analyze
 * @access  Private (ADMIN, LOGISTICS_OPERATOR)
 */
exports.analyzeRoute = async (req, res, next) => {
  try {
    const idParam = req.params.id;
    let route = await findRouteByIdOrName(idParam);
    const bodyPayload = req.body || {};

    // Determine location names and address details from DB or request body
    let originLocName = route?.origin?.locationName || bodyPayload.origin?.locationName || bodyPayload.originName || bodyPayload.origin;
    let originAddress = route?.origin?.address || bodyPayload.origin?.address || bodyPayload.originAddress || '';
    let originLat = route?.origin?.coordinates?.latitude || bodyPayload.origin?.coordinates?.latitude || bodyPayload.originCoordinates?.latitude;
    let originLon = route?.origin?.coordinates?.longitude || bodyPayload.origin?.coordinates?.longitude || bodyPayload.originCoordinates?.longitude;

    let destLocName = route?.destination?.locationName || bodyPayload.destination?.locationName || bodyPayload.destinationName || bodyPayload.destination;
    let destAddress = route?.destination?.address || bodyPayload.destination?.address || bodyPayload.destinationAddress || '';
    let destLat = route?.destination?.coordinates?.latitude || bodyPayload.destination?.coordinates?.latitude || bodyPayload.destinationCoordinates?.latitude;
    let destLon = route?.destination?.coordinates?.longitude || bodyPayload.destination?.coordinates?.longitude || bodyPayload.destinationCoordinates?.longitude;

    // If neither DB route nor body payload contains location names, only then return 404
    if (!originLocName && !destLocName) {
      return res.status(404).json({
        success: false,
        message: `Route not found for identifier "${idParam}". Please select a valid route.`
      });
    }

    if (!originLocName) originLocName = 'Origin Depot';
    if (!destLocName) destLocName = 'Destination Hub';

    // Extract and geocode origin
    let origin = {
      locationName: originLocName,
      address: originAddress,
      latitude: originLat,
      longitude: originLon
    };

    if (!origin.latitude || !origin.longitude) {
      console.log(`[Route Intelligence] Geocoding origin location: "${origin.locationName}"...`);
      const coords = await geocodeLocation(origin.locationName, origin.address);
      if (!coords) {
        return res.status(400).json({
          success: false,
          message: `Unable to resolve coordinates for origin location: ${origin.locationName}`
        });
      }
      origin.latitude = coords.latitude;
      origin.longitude = coords.longitude;

      if (route && route.origin) {
        route.origin.coordinates = { latitude: coords.latitude, longitude: coords.longitude };
        await route.save().catch(err => console.warn('[Route Intelligence] Saved origin coords warning:', err.message));
      }
    }

    // Extract and geocode destination
    let destination = {
      locationName: destLocName,
      address: destAddress,
      latitude: destLat,
      longitude: destLon
    };

    if (!destination.latitude || !destination.longitude) {
      console.log(`[Route Intelligence] Geocoding destination location: "${destination.locationName}"...`);
      const coords = await geocodeLocation(destination.locationName, destination.address);
      if (!coords) {
        return res.status(400).json({
          success: false,
          message: `Unable to resolve coordinates for destination location: ${destination.locationName}`
        });
      }
      destination.latitude = coords.latitude;
      destination.longitude = coords.longitude;

      if (route && route.destination) {
        route.destination.coordinates = { latitude: coords.latitude, longitude: coords.longitude };
        await route.save().catch(err => console.warn('[Route Intelligence] Saved dest coords warning:', err.message));
      }
    }

    // Gather context for risk analysis
    const context = {
      shipmentType: route?.shipments?.[0]?.goodsType || bodyPayload.shipments?.[0]?.goodsType || 'general cargo',
      priority: route?.shipments?.[0]?.priority || bodyPayload.shipments?.[0]?.priority || 'MEDIUM',
      vehicleType: route?.assignedVehicle?.vehicleType || bodyPayload.assignedVehicle?.vehicleType || 'truck',
      routeName: route?.routeName || bodyPayload.routeName || `${origin.locationName} -> ${destination.locationName}`,
      distanceKm: route?.distance || bodyPayload.distance,
      durationMinutes: route?.estimatedDuration || bodyPayload.estimatedDuration
    };

    // Perform complete AI route intelligence analysis
    let analysis;
    try {
      analysis = await analyzeRouteIntelligence(origin, destination, context);
    } catch (routingError) {
      console.error('[Route Intelligence] Routing calculation error:', routingError);
      if (routingError.message?.includes('Routing service unavailable')) {
        return res.status(503).json({
          success: false,
          message: 'Routing service unavailable. Please check API configuration.',
          error: routingError.message
        });
      }
      throw routingError;
    }

    res.status(200).json({
      success: true,
      message: 'Route intelligence analysis completed',
      data: {
        routeId: route?.routeId || idParam || 'route_1',
        routeName: route?.routeName || bodyPayload.routeName || `${origin.locationName} -> ${destination.locationName}`,
        analysis
      }
    });

  } catch (error) {
    console.error('[Route Intelligence] Analysis error:', error);
    
    if (error.message?.includes('geocode')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        message: 'Service rate limit reached. Please try again in a moment.'
      });
    }

    next(error);
  }
};

/**
 * @desc    Get alternative routes for a route
 * @route   GET /api/routes/:id/alternatives
 * @access  Private (ADMIN, LOGISTICS_OPERATOR)
 */
exports.getRouteAlternatives = async (req, res, next) => {
  try {
    const route = await findRouteByIdOrName(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check if route already has analyzed alternatives
    if (route.alternatives && route.alternatives.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Route alternatives retrieved from cache',
        data: {
          routeId: route.routeId,
          alternatives: route.alternatives,
          analyzedAt: route.riskAnalysis?.analyzedAt
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'No alternatives available. Run route analysis first.',
      data: {
        routeId: route.routeId,
        alternatives: []
      }
    });

  } catch (error) {
    console.error('[Route Intelligence] Get alternatives error:', error);
    next(error);
  }
};

/**
 * @desc    Select and confirm a route alternative
 * @route   POST /api/routes/:id/select
 * @access  Private (ADMIN, LOGISTICS_OPERATOR)
 */
exports.selectRouteAlternative = async (req, res, next) => {
  try {
    const { routeId: selectedRouteId, routeData } = req.body;

    if (!selectedRouteId || !routeData) {
      return res.status(400).json({
        success: false,
        message: 'selectedRouteId and routeData are required'
      });
    }

    const route = await findRouteByIdOrName(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Update route with selected alternative
    route.selectedRouteData = {
      routeId: selectedRouteId,
      routeName: routeData.routeName,
      coordinates: routeData.coordinates,
      distanceKm: routeData.distanceKm,
      durationMinutes: routeData.durationMinutes,
      riskLevel: routeData.riskAnalysis?.riskLevel,
      riskScore: routeData.riskAnalysis?.riskScore,
      selectedAt: new Date()
    };

    // Update distance and estimated duration with selected route
    route.distance = routeData.distanceKm;
    route.estimatedDuration = routeData.durationMinutes;

    // Store risk analysis
    if (routeData.riskAnalysis) {
      route.riskAnalysis = {
        level: routeData.riskAnalysis.riskLevel,
        score: routeData.riskAnalysis.riskScore,
        factors: routeData.riskAnalysis.riskFactors,
        analyzedAt: new Date()
      };
    }

    await route.save();

    res.status(200).json({
      success: true,
      message: 'Route alternative selected and confirmed',
      data: route
    });

  } catch (error) {
    console.error('[Route Intelligence] Select route error:', error);
    next(error);
  }
};

/**
 * @desc    Get current risk analysis for a route
 * @route   GET /api/routes/:id/risk
 * @access  Private (Authenticated users)
 */
exports.getRouteRisk = async (req, res, next) => {
  try {
    const route = await findRouteByIdOrName(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    if (!route.riskAnalysis) {
      return res.status(200).json({
        success: true,
        message: 'No risk analysis available. Run route analysis first.',
        data: {
          routeId: route.routeId,
          riskAnalysis: null
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        routeId: route.routeId,
        routeName: route.routeName,
        riskAnalysis: route.riskAnalysis,
        selectedRouteData: route.selectedRouteData
      }
    });

  } catch (error) {
    console.error('[Route Intelligence] Get risk error:', error);
    next(error);
  }
};

module.exports = exports;
