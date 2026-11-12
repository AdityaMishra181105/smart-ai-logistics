const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');

const { generateDeterministicRoutes } = require('../services/demoRouteService');
const { resolveNERLocation } = require('../utils/locationResolver');
const {
  getLocationEnvironmentalRisk,
  getRouteEnvironmentalRisk
} = require('../services/environmentalRisk/environmentalRiskService');

// Helper: resolve coordinates from shipment pickup or destination object
const getCoordinates = (locData) => {
  if (!locData) return null;
  if (locData.latitude && locData.longitude) {
    return [locData.latitude, locData.longitude];
  }
  const resolved = resolveNERLocation(locData.locationName);
  if (resolved) {
    return [resolved.latitude, resolved.longitude];
  }
  return null;
};

// Helper: Map score to risk levels
const getRiskLevelForScore = (score) => {
  if (score > 75) return 'CRITICAL';
  if (score > 50) return 'HIGH';
  if (score > 25) return 'MEDIUM';
  return 'LOW';
};

// @desc    Get environmental data and risks for a location
// @route   GET /api/environment/location
// @access  Private (ADMIN)
exports.getLocationRisk = async (req, res, next) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location query parameter is required.'
      });
    }

    const data = getLocationEnvironmentalRisk(location);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get environmental and combined risk assessment for a specific route
// @route   GET /api/environment/route/:shipmentId/:routeId
// @access  Private (ADMIN)
exports.getRouteRisk = async (req, res, next) => {
  try {
    const { shipmentId, routeId } = req.params;

    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    const pickupCoords = getCoordinates(shipment.pickup);
    const destCoords = getCoordinates(shipment.destination);

    if (!pickupCoords || !destCoords) {
      return res.status(400).json({
        success: false,
        message: 'Pickup or destination coordinates could not be resolved for shipment.'
      });
    }

    const routes = generateDeterministicRoutes(
      pickupCoords,
      destCoords,
      shipment.priority,
      shipment._id || shipment.shipmentId
    );
    const route = routes.find((r) => r.routeId === routeId);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: `Route alternatives '${routeId}' not found for shipment.`
      });
    }

    const envRisk = getRouteEnvironmentalRisk(route);

    const geoScore = route.riskScore;
    const envScore = envRisk.overallRisk.score;
    const combinedScore = Math.round(geoScore * 0.45 + envScore * 0.55);

    const geoRiskObj = {
      score: geoScore,
      level: route.riskLevel,
      factors: route.riskFactors || ['Geographic safety zones clear.']
    };

    const envRiskObj = {
      score: envScore,
      level: envRisk.overallRisk.level,
      factors: envRisk.overallRisk.factors
    };

    const combinedRiskObj = {
      score: combinedScore,
      level: getRiskLevelForScore(combinedScore),
      factors: [...geoRiskObj.factors, ...envRiskObj.factors]
    };

    res.status(200).json({
      success: true,
      data: {
        routeId,
        geographicRisk: geoRiskObj,
        environmentalRisk: envRiskObj,
        combinedRisk: combinedRiskObj,
        samples: envRisk.samples,
        source: 'DEMO'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get environmental and combined risk assessment for all route alternatives
// @route   GET /api/environment/route/:shipmentId
// @access  Private (ADMIN)
exports.getShipmentRouteRisks = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;

    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    const pickupCoords = getCoordinates(shipment.pickup);
    const destCoords = getCoordinates(shipment.destination);

    if (!pickupCoords || !destCoords) {
      return res.status(400).json({
        success: false,
        message: 'Pickup or destination coordinates could not be resolved for shipment.'
      });
    }

    const routes = generateDeterministicRoutes(
      pickupCoords,
      destCoords,
      shipment.priority,
      shipment._id || shipment.shipmentId
    );

    const assessments = routes.map((route) => {
      const envRisk = getRouteEnvironmentalRisk(route);
      const geoScore = route.riskScore;
      const envScore = envRisk.overallRisk.score;
      const combinedScore = Math.round(geoScore * 0.45 + envScore * 0.55);

      return {
        routeId: route.routeId,
        geographicRisk: {
          score: geoScore,
          level: route.riskLevel,
          factors: route.riskFactors
        },
        environmentalRisk: {
          score: envScore,
          level: envRisk.overallRisk.level,
          factors: envRisk.overallRisk.factors
        },
        combinedRisk: {
          score: combinedScore,
          level: getRiskLevelForScore(combinedScore),
          factors: [...route.riskFactors, ...envRisk.overallRisk.factors]
        },
        samples: envRisk.samples,
        source: 'DEMO'
      };
    });

    res.status(200).json({
      success: true,
      data: assessments
    });
  } catch (error) {
    next(error);
  }
};
