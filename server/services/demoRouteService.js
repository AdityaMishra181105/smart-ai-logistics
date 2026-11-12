/**
 * Route Generation Service
 * 
 * Provides algorithmic route generation functionality for shipments.
 * This service generates route alternatives based on pickup and destination coordinates.
 * 
 * Note: This is an algorithmic route generator. For production use, consider
 * integrating with external routing APIs (e.g., Google Maps, OpenRouteService, OSRM).
 */

const { calculateRouteRisk, getHaversineDistance } = require('./routeRiskService');

// Configurable speed settings based on route classifications
const roadSpeeds = {
  GOOD: 45,       // 45 km/h
  MODERATE: 35,   // 35 km/h
  POOR: 25,       // 25 km/h
  MOUNTAIN: 20    // 20 km/h
};

// Sum coordinates distance in kilometers
const calculateTotalDistance = (coords = []) => {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    total += getHaversineDistance(lat1, lon1, lat2, lon2);
  }
  return Math.round(total * 10) / 10; // 1 decimal place
};

/**
 * Deterministically generates exactly 3 route options (FASTEST, SAFEST, BALANCED)
 * connecting pickup and destination coordinates.
 */
const generateDeterministicRoutes = (pickup, destination, priority = 'MEDIUM', shipmentId = '') => {
  const currentYear = new Date().getFullYear();

  // Helper to interpolate waypoints and apply controlled sinusoidal offsets
  const buildPath = (type) => {
    const coords = [pickup];
    const steps = 5;

    for (let i = 1; i <= steps; i++) {
      const ratio = i / (steps + 1);
      const lat = pickup[0] + (destination[0] - pickup[0]) * ratio;
      const lon = pickup[1] + (destination[1] - pickup[1]) * ratio;

      let offsetLat = 0;
      let offsetLon = 0;

      // Controlled geographic offsets to ensure distinct paths
      if (type === 'FASTEST') {
        offsetLat = Math.sin(ratio * Math.PI) * 0.06;
        offsetLon = Math.sin(ratio * Math.PI) * -0.06;
      } else if (type === 'SAFEST') {
        // Safe routes bypass risk centers (wider offset)
        offsetLat = Math.sin(ratio * Math.PI) * -0.16;
        offsetLon = Math.sin(ratio * Math.PI) * 0.16;
      } else {
        // BALANCED
        offsetLat = Math.sin(ratio * Math.PI) * 0.09;
        offsetLon = Math.sin(ratio * Math.PI) * 0.09;
      }

      coords.push([lat + offsetLat, lon + offsetLon]);
    }

    coords.push(destination);
    return coords;
  };

  // Route configurations mapping
  const routeConfigs = [
    {
      type: 'FASTEST',
      name: 'Mountain Corridor Route (Fastest)',
      roadCondition: 'MOUNTAIN',
      baseDurationMultiplier: 1.0
    },
    {
      type: 'SAFEST',
      name: 'Highway Bypass Route (Safest)',
      roadCondition: 'GOOD',
      baseDurationMultiplier: 1.0
    },
    {
      type: 'BALANCED',
      name: 'Balanced Transit Route',
      roadCondition: 'MODERATE',
      baseDurationMultiplier: 1.0
    }
  ];

  const generatedRoutes = routeConfigs.map((config, index) => {
    const coords = buildPath(config.type);
    const distanceKm = calculateTotalDistance(coords);
    
    // Calculate estimated duration
    const avgSpeed = roadSpeeds[config.roadCondition] || 35;
    const rawDurationMinutes = (distanceKm / avgSpeed) * 60;
    const estimatedDurationMinutes = Math.round(rawDurationMinutes);

    // Calculate risk scores based on coordinates intersections
    const { riskScore, riskLevel, riskFactors } = calculateRouteRisk(coords);

    // Generate formatted route serial identifier
    const routeId = `RTE-${currentYear}-${String(index + 1).padStart(4, '0')}`;

    return {
      routeId,
      shipmentId,
      name: config.name,
      type: config.type,
      coordinates: coords,
      distanceKm,
      estimatedDurationMinutes,
      roadCondition: config.roadCondition,
      riskScore,
      riskLevel,
      riskFactors,
      status: 'AVAILABLE',
      createdAt: new Date()
    };
  });

  return generatedRoutes;
};

module.exports = {
  generateDeterministicRoutes
};
