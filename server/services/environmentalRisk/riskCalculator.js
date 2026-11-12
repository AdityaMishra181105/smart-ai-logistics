const { RiskLevels, RiskWeights } = require('./riskConstants');

/**
 * Calculates the combined overall environmental risk score, level, and factors.
 * @param {Object} subRisks - Individual risk score metrics
 * @param {number} subRisks.rainfallScore 
 * @param {number} subRisks.floodScore 
 * @param {number} subRisks.landslideScore 
 * @param {number} subRisks.visibilityScore 
 * @returns {Object} { score, level, factors }
 */
const calculateCombinedEnvironmentalRisk = (subRisks) => {
  const {
    rainfallScore = 0,
    floodScore = 0,
    landslideScore = 0,
    visibilityScore = 0
  } = subRisks;

  // Apply weightings: 25% Rainfall, 25% Flood, 30% Landslide, 20% Visibility
  const weightedScore =
    rainfallScore * RiskWeights.RAINFALL +
    floodScore * RiskWeights.FLOOD +
    landslideScore * RiskWeights.LANDSLIDE +
    visibilityScore * RiskWeights.VISIBILITY;

  const score = Math.round(weightedScore);

  // Map to risk levels
  let level = RiskLevels.LOW;
  if (score > 75) {
    level = RiskLevels.CRITICAL;
  } else if (score > 50) {
    level = RiskLevels.HIGH;
  } else if (score > 25) {
    level = RiskLevels.MEDIUM;
  }

  // Compile descriptive factors for items with significant risk scores (> 50)
  const factors = [];
  if (rainfallScore > 75) {
    factors.push('Heavy torrential rainfall conditions detected along route');
  } else if (rainfallScore > 50) {
    factors.push('Moderate rainfall precipitation active');
  }

  if (floodScore > 75) {
    factors.push('Critical flood risk: Route intersects active low-lying inundation zones');
  } else if (floodScore > 50) {
    factors.push('High river basin/flood plain susceptibility');
  }

  if (landslideScore > 75) {
    factors.push('Critical landslide risk: Mountain pass route highly susceptible to rockfall');
  } else if (landslideScore > 50) {
    factors.push('High landslide susceptibility near steep terrain corridors');
  }

  if (visibilityScore > 75) {
    factors.push('Critical reduced visibility (fog/blizzard) causing transit safety hazard');
  } else if (visibilityScore > 50) {
    factors.push('Reduced visibility active along mountain passes');
  }

  if (factors.length === 0) {
    factors.push('No significant meteorological or physical terrain alerts active.');
  }

  return {
    score,
    level,
    factors
  };
};

module.exports = {
  calculateCombinedEnvironmentalRisk
};
