const { getDeterministicEnvironmentalData } = require('./demoEnvironmentalProvider');
const { calculateCombinedEnvironmentalRisk } = require('./riskCalculator');
const { nerLocations } = require('../../constants/nerLocations');
const { getHaversineDistance } = require('../routeRiskService');
const { RiskLevels } = require('./riskConstants');

// Helper: Match coordinate to closest seeded location within 25km, or format coordinate label
const getClosestLocationName = (lat, lon) => {
  for (const loc of nerLocations) {
    const dist = getHaversineDistance(lat, lon, loc.latitude, loc.longitude);
    if (dist <= 25) { // 25 km proximity threshold
      return loc.name;
    }
  }
  return `Point (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
};

// Map score to risk levels
const getRiskLevelForScore = (score) => {
  if (score > 75) return RiskLevels.CRITICAL;
  if (score > 50) return RiskLevels.HIGH;
  if (score > 25) return RiskLevels.MEDIUM;
  return RiskLevels.LOW;
};

/**
 * Returns complete environmental parameters and combined risk score for a single location name.
 */
const getLocationEnvironmentalRisk = (locationName) => {
  console.log('DEMO ENVIRONMENTAL INTELLIGENCE ACTIVE: Fetching data for location:', locationName);
  const data = getDeterministicEnvironmentalData(locationName);
  
  // Calculate combined risk score
  const overall = calculateCombinedEnvironmentalRisk({
    rainfallScore: data.weather.rainfallRiskScore,
    floodScore: data.flood.riskScore,
    landslideScore: data.landslide.riskScore,
    visibilityScore: data.visibility.riskScore
  });

  return {
    ...data,
    overallRisk: overall,
    source: 'DEMO',
    updatedAt: new Date().toISOString()
  };
};

/**
 * Samples up to 5 coordinate points along a route, evaluates their environmental data,
 * and aggregates the results using a worst-case ("maximum significant risk") strategy.
 */
const getRouteEnvironmentalRisk = (route) => {
  if (!route || !route.coordinates || route.coordinates.length === 0) {
    throw new Error('Invalid route or missing coordinates.');
  }

  const coords = route.coordinates;
  const L = coords.length;
  const sampleIndices = [];

  // Sample exactly 5 points (start, end, and 3 intermediate)
  if (L <= 5) {
    for (let i = 0; i < L; i++) sampleIndices.push(i);
  } else {
    sampleIndices.push(0);
    sampleIndices.push(Math.floor(L * 0.25));
    sampleIndices.push(Math.floor(L * 0.5));
    sampleIndices.push(Math.floor(L * 0.75));
    sampleIndices.push(L - 1);
  }

  // Evaluate each sample point
  const samples = sampleIndices.map((idx) => {
    const [lat, lon] = coords[idx];
    const locationName = getClosestLocationName(lat, lon);
    const riskData = getLocationEnvironmentalRisk(locationName);

    return {
      waypointIndex: idx,
      coordinates: [lat, lon],
      locationName,
      weather: riskData.weather,
      flood: riskData.flood,
      landslide: riskData.landslide,
      visibility: riskData.visibility,
      overallRisk: riskData.overallRisk
    };
  });

  // Aggregate scores using maximum significant risk strategy (worst case)
  let maxRainScore = 0;
  let maxFloodScore = 0;
  let maxLandslideScore = 0;
  let maxVisScore = 0;

  for (const sample of samples) {
    maxRainScore = Math.max(maxRainScore, sample.weather.rainfallRiskScore);
    maxFloodScore = Math.max(maxFloodScore, sample.flood.riskScore);
    maxLandslideScore = Math.max(maxLandslideScore, sample.landslide.riskScore);
    maxVisScore = Math.max(maxVisScore, sample.visibility.riskScore);
  }

  // Calculate aggregated combined overall risk index
  const aggregatedOverall = calculateCombinedEnvironmentalRisk({
    rainfallScore: maxRainScore,
    floodScore: maxFloodScore,
    landslideScore: maxLandslideScore,
    visibilityScore: maxVisScore
  });

  return {
    routeId: route.routeId,
    samples,
    rainfall: {
      score: maxRainScore,
      level: getRiskLevelForScore(maxRainScore)
    },
    flood: {
      score: maxFloodScore,
      level: getRiskLevelForScore(maxFloodScore)
    },
    landslide: {
      score: maxLandslideScore,
      level: getRiskLevelForScore(maxLandslideScore)
    },
    visibility: {
      score: maxVisScore,
      level: getRiskLevelForScore(maxVisScore)
    },
    overallRisk: aggregatedOverall,
    source: 'DEMO'
  };
};

module.exports = {
  getLocationEnvironmentalRisk,
  getRouteEnvironmentalRisk
};
