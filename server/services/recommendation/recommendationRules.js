const { BaseWeightProfiles, CategoryAdjustments, RiskPenalties } = require('./recommendationConstants');

/**
 * Returns Normalized Weights based on Shipment Priority & Category.
 * Weights are guaranteed to sum to exactly 100.
 */
const getNormalizedWeights = (priority = 'NORMAL', category = 'OTHER') => {
  const normPriority = (priority || 'NORMAL').toUpperCase();
  const normCategory = (category || 'OTHER').toUpperCase();

  const base = BaseWeightProfiles[normPriority] || BaseWeightProfiles.NORMAL;
  const adjustment = CategoryAdjustments[normCategory] || CategoryAdjustments.OTHER;

  // Apply offsets, preventing negative weights
  let wDistance = Math.max(0, base.distance + (adjustment.distance || 0));
  let wDuration = Math.max(0, base.duration + (adjustment.duration || 0));
  let wSafety = Math.max(0, base.safety + (adjustment.safety || 0));
  let wEnvironmental = Math.max(0, base.environmental + (adjustment.environmental || 0));

  const sum = wDistance + wDuration + wSafety + wEnvironmental;
  if (sum === 0) {
    return { distance: 25, duration: 25, safety: 35, environmental: 15 };
  }

  // Round percentages
  wDistance = Math.round((wDistance / sum) * 100);
  wDuration = Math.round((wDuration / sum) * 100);
  wSafety = Math.round((wSafety / sum) * 100);
  wEnvironmental = Math.round((wEnvironmental / sum) * 100);

  // Compensate for rounding deviations
  const roundedSum = wDistance + wDuration + wSafety + wEnvironmental;
  if (roundedSum !== 100) {
    const diff = 100 - roundedSum;
    wSafety += diff; // Adjust safety weight (typically the primary decision factor)
  }

  return {
    distance: wDistance,
    duration: wDuration,
    safety: wSafety,
    environmental: wEnvironmental
  };
};

/**
 * Calculates sub-scores (0-100) for routes relative to the best available choices.
 */
const getNormalizedSubScores = (routes = [], envRisksMap = {}) => {
  if (routes.length === 0) return [];

  const minDistance = Math.min(...routes.map((r) => r.distanceKm));
  const minDuration = Math.min(...routes.map((r) => r.estimatedDurationMinutes));

  return routes.map((route) => {
    // Relative distance efficiency (shortest is 100)
    const distanceScore = Math.max(
      0,
      Math.min(100, Math.round((minDistance / route.distanceKm) * 100))
    );

    // Relative duration efficiency (fastest is 100)
    const durationScore = Math.max(
      0,
      Math.min(100, Math.round((minDuration / route.estimatedDurationMinutes) * 100))
    );

    // Safety and Environmental metrics from loaded risk profiles
    const envData = envRisksMap[route.routeId];
    let combinedRiskScore = route.riskScore;
    let envRiskScore = 30; // fallback default
    
    if (envData && envData.overallRisk) {
      envRiskScore = envData.overallRisk.score;
      combinedRiskScore = Math.round(route.riskScore * 0.45 + envRiskScore * 0.55);
    }

    const safetyScore = Math.max(0, Math.min(100, 100 - combinedRiskScore));
    const environmentalScore = Math.max(0, Math.min(100, 100 - envRiskScore));

    return {
      routeId: route.routeId,
      distanceScore,
      durationScore,
      safetyScore,
      environmentalScore,
      combinedRiskScore
    };
  });
};

module.exports = {
  getNormalizedWeights,
  getNormalizedSubScores
};
