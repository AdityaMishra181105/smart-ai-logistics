/**
 * Route Risk Service
 * 
 * Provides risk calculation functionality for routes based on environmental factors.
 * All hardcoded demo risk zones have been removed. 
 * 
 * Risk zones should be:
 * - Fetched from database/API
 * - Based on real-time environmental data
 * - Integrated with external risk assessment services
 */

// Empty array - no hardcoded demo risk zones
// Risk zones should be fetched from the database or external APIs
const riskZones = [];

// Helper: calculate Haversine distance in kilometers
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates a preliminary risk score (0-100) and compiles factors
 * based on coordinate proximity to risk zones.
 * @param {Array} coordinates - Array of [latitude, longitude] route waypoints
 * @param {Array} dynamicRiskZones - Optional array of risk zones to use instead of hardcoded ones
 * @returns {Object} { riskScore, riskLevel, riskFactors }
 */
const calculateRouteRisk = (coordinates = [], dynamicRiskZones = null) => {
  // Use provided risk zones or fall back to empty array
  const zonesToCheck = dynamicRiskZones || riskZones;
  
  // If no risk zones available, return minimal risk
  if (!zonesToCheck || zonesToCheck.length === 0) {
    return {
      riskScore: 0,
      riskLevel: 'LOW',
      riskFactors: ['No risk zone data available for this route.']
    };
  }

  let accumulatedPoints = 0;
  const intersectedZoneIds = new Set();
  const riskFactors = [];

  // Risk weighting tokens
  const baseWeights = {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 45,
    CRITICAL: 70
  };

  // Inspect each route waypoint
  for (const waypoint of coordinates) {
    const [wpLat, wpLon] = waypoint;

    for (const zone of zonesToCheck) {
      if (intersectedZoneIds.has(zone.id)) continue;

      const [zLat, zLon] = zone.center;
      const distance = getHaversineDistance(wpLat, wpLon, zLat, zLon);
      const zoneRadiusKm = zone.radius / 1000; // convert meters to km

      // Waypoint falls inside risk boundary
      if (distance <= zoneRadiusKm) {
        intersectedZoneIds.add(zone.id);
        const weight = baseWeights[zone.riskLevel] || 10;
        accumulatedPoints += weight;
        
        const riskText = `${zone.name} (${zone.riskLevel} severity): ${zone.description}`;
        riskFactors.push(riskText);
      }
    }
  }

  // Normalize final score (0-100)
  const riskScore = Math.min(accumulatedPoints, 100);

  // Map score to risk level labels
  let riskLevel = 'LOW';
  if (riskScore > 75) {
    riskLevel = 'CRITICAL';
  } else if (riskScore > 50) {
    riskLevel = 'HIGH';
  } else if (riskScore > 25) {
    riskLevel = 'MEDIUM';
  }

  if (riskFactors.length === 0) {
    riskFactors.push('No significant hazard zones intersected along this path.');
  }

  return {
    riskScore,
    riskLevel,
    riskFactors
  };
};

module.exports = {
  calculateRouteRisk,
  getHaversineDistance
};
