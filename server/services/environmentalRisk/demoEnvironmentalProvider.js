const { WeatherConditions, RiskLevels, PredefinedLocationProfiles } = require('./riskConstants');

// Helper: stable string hash code generator
const getStableHash = (str = '') => {
  let hash = 0;
  const normalized = str.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Calculate rainfall risk parameters smoothly
const getRainfallRisk = (rainfallMm) => {
  let score = 0;
  let level = RiskLevels.LOW;

  if (rainfallMm <= 5) {
    level = RiskLevels.LOW;
    score = Math.round((rainfallMm / 5) * 25);
  } else if (rainfallMm <= 20) {
    level = RiskLevels.MEDIUM;
    score = 26 + Math.round(((rainfallMm - 5) / 15) * 24);
  } else if (rainfallMm <= 50) {
    level = RiskLevels.HIGH;
    score = 51 + Math.round(((rainfallMm - 20) / 30) * 24);
  } else {
    level = RiskLevels.CRITICAL;
    score = 76 + Math.min(Math.round(((rainfallMm - 50) / 100) * 24), 24);
  }

  return { score, level };
};

// Calculate visibility risk parameters smoothly from visibilityKm
const getVisibilityRisk = (visibilityKm) => {
  let score = 0;
  let level = RiskLevels.LOW;

  if (visibilityKm >= 10) {
    level = RiskLevels.LOW;
    score = Math.max(0, Math.round((12 - visibilityKm) * 10)); // e.g. 12km -> 0, 10km -> 20
  } else if (visibilityKm >= 5) {
    level = RiskLevels.MEDIUM;
    score = 26 + Math.round(((10 - visibilityKm) / 5) * 24);
  } else if (visibilityKm >= 2) {
    level = RiskLevels.HIGH;
    score = 51 + Math.round(((5 - visibilityKm) / 3) * 24);
  } else {
    level = RiskLevels.CRITICAL;
    score = 76 + Math.min(Math.round(((2 - visibilityKm) / 2) * 24), 24);
  }

  return { score, level };
};

// Get label for risk scores (flood, landslide)
const getRiskLabel = (score) => {
  if (score > 75) return RiskLevels.CRITICAL;
  if (score > 50) return RiskLevels.HIGH;
  if (score > 25) return RiskLevels.MEDIUM;
  return RiskLevels.LOW;
};

/**
 * Generates deterministic weather and environmental indices for a location.
 * @param {string} locationName - The target location identifier
 * @returns {Object} raw environmental factors
 */
const getDeterministicEnvironmentalData = (locationName = '') => {
  const normName = locationName.trim().toLowerCase();
  
  // Find predefined matching region Profile (e.g. "Guwahati Med Depot" matches "guwahati")
  let profileKey = Object.keys(PredefinedLocationProfiles).find(
    (key) => normName === key || normName.includes(key) || key.includes(normName)
  );

  let rawData;

  if (profileKey) {
    // Return structured profile data
    const p = PredefinedLocationProfiles[profileKey];
    rawData = {
      condition: p.condition,
      rainfallMm: p.rainfallMm,
      temperatureC: p.temperatureC,
      visibilityKm: p.visibilityKm,
      floodScore: p.floodScore,
      landslideScore: p.landslideScore
    };
  } else {
    // Generate deterministic variables using stable string hash for unknown locations
    const hash = getStableHash(locationName);
    const conditions = Object.values(WeatherConditions);
    
    const condition = conditions[hash % conditions.length];
    
    // Scale parameters based on condition type
    let rainfallMm = 0;
    let visibilityKm = 10.0;
    
    if (condition === WeatherConditions.HEAVY_RAIN || condition === WeatherConditions.STORM) {
      rainfallMm = 50 + (hash % 60);
      visibilityKm = 1.5 + ((hash % 30) / 10);
    } else if (condition === WeatherConditions.MODERATE_RAIN) {
      rainfallMm = 15 + (hash % 30);
      visibilityKm = 4.0 + ((hash % 40) / 10);
    } else if (condition === WeatherConditions.LIGHT_RAIN) {
      rainfallMm = 2 + (hash % 10);
      visibilityKm = 7.0 + ((hash % 30) / 10);
    } else if (condition === WeatherConditions.FOG) {
      rainfallMm = 0;
      visibilityKm = 0.5 + ((hash % 15) / 10);
    } else if (condition === WeatherConditions.CLOUDY) {
      rainfallMm = 0;
      visibilityKm = 9.0;
    } else {
      // CLEAR
      rainfallMm = 0;
      visibilityKm = 12.0;
    }

    const temperatureC = 12 + (hash % 20); // 12-31 C
    const floodScore = hash % 101; // 0-100
    const landslideScore = hash % 101; // 0-100

    rawData = {
      condition,
      rainfallMm,
      temperatureC,
      visibilityKm,
      floodScore,
      landslideScore
    };
  }

  // Calculate specific risk vectors
  const rainRisk = getRainfallRisk(rawData.rainfallMm);
  const visRisk = getVisibilityRisk(rawData.visibilityKm);

  return {
    locationName,
    weather: {
      condition: rawData.condition,
      rainfallMm: rawData.rainfallMm,
      temperatureC: rawData.temperatureC,
      visibilityKm: rawData.visibilityKm,
      rainfallRiskScore: rainRisk.score,
      rainfallRiskLevel: rainRisk.level
    },
    flood: {
      riskScore: rawData.floodScore,
      riskLevel: getRiskLabel(rawData.floodScore),
      active: rawData.floodScore > 50
    },
    landslide: {
      riskScore: rawData.landslideScore,
      riskLevel: getRiskLabel(rawData.landslideScore),
      active: rawData.landslideScore > 50
    },
    visibility: {
      riskScore: visRisk.score,
      riskLevel: visRisk.level
    }
  };
};

module.exports = {
  getDeterministicEnvironmentalData
};
