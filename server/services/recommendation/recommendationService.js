const { generateDeterministicRoutes } = require('../demoRouteService');
const { getRouteEnvironmentalRisk } = require('../environmentalRisk/environmentalRiskService');
const { runRecommendationEngine } = require('./recommendationEngine');
const { resolveNERLocation } = require('../../utils/locationResolver');

// Simple in-memory cache store
const recommendationCache = {};

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

// Helper: Generate cache state fingerprint
const getCacheFingerprint = (shipment) => {
  const pickupName = shipment.pickup?.locationName || '';
  const destName = shipment.destination?.locationName || '';
  const priority = shipment.priority || 'NORMAL';
  const category = shipment.category || 'OTHER';
  const selectedRouteId = shipment.selectedRouteId || '';
  return `${priority}-${category}-${pickupName}-${destName}-${selectedRouteId}`;
};

/**
 * Loads route alternatives and evaluates recommendations for a shipment.
 */
const getShipmentRecommendation = (shipment) => {
  if (!shipment) {
    throw new Error('Shipment data is required.');
  }

  const shipmentId = shipment._id || shipment.shipmentId;
  const cacheKey = String(shipmentId);
  const fingerprint = getCacheFingerprint(shipment);

  // Check in-memory cache hit
  if (recommendationCache[cacheKey] && recommendationCache[cacheKey].fingerprint === fingerprint) {
    console.log('SMART ROUTE RECOMMENDATION CACHE HIT for shipment:', shipmentId);
    return recommendationCache[cacheKey].data;
  }

  console.log('SMART ROUTE DECISION ENGINE ACTIVE: Evaluating routes for shipment:', shipmentId);

  const pickupCoords = getCoordinates(shipment.pickup);
  const destCoords = getCoordinates(shipment.destination);

  if (!pickupCoords || !destCoords) {
    throw new Error('Shipment pickup or destination coordinates could not be resolved.');
  }

  // 1. Generate route alternatives deterministically
  const routes = generateDeterministicRoutes(
    pickupCoords,
    destCoords,
    shipment.priority || 'NORMAL',
    shipmentId
  );

  // 2. Fetch environmental risk for all routes
  const envRisksMap = {};
  routes.forEach((route) => {
    try {
      const envRisk = getRouteEnvironmentalRisk(route);
      envRisksMap[route.routeId] = envRisk;
    } catch (err) {
      console.warn(`Failed to resolve environmental risks for route ${route.routeId}:`, err.message);
    }
  });

  // 3. Run decision scoring rules
  const recommendation = runRecommendationEngine(
    routes,
    envRisksMap,
    shipment.priority || 'NORMAL',
    shipment.category || 'OTHER'
  );

  const responseData = {
    shipmentId,
    ...recommendation,
    source: 'SMART_RULE_ENGINE',
    generatedAt: new Date().toISOString()
  };

  // Cache recommendation
  recommendationCache[cacheKey] = {
    fingerprint,
    data: responseData
  };

  return responseData;
};

module.exports = {
  getShipmentRecommendation
};
