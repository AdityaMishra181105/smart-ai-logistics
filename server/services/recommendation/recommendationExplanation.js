/**
 * Generates deterministic, explainable reasons and factors for a recommended route selection.
 * @param {Object} route - The target route object
 * @param {Object} subScores - Normalized scores for this route
 * @param {Object} weights - Normalised weight profile applied
 * @param {string} priority - Shipment priority
 * @param {string} category - Cargo category
 * @returns {Object} { summary, strengths, warnings, decisionFactors }
 */
const generateRouteExplanation = (route, subScores, weights, priority, category) => {
  const strengths = [];
  const warnings = [];
  const decisionFactors = [
    `Priority Profile: ${priority} (Safety: ${weights.safety}%, Speed: ${weights.duration}%, Dist: ${weights.distance}%, Env: ${weights.environmental}%)`,
    `Category adjustment applied: ${category}`
  ];

  // Evaluate strengths based on sub-scores
  if (subScores.durationScore >= 95) {
    strengths.push('Offers the shortest estimated transit duration among viable corridors.');
  }
  if (subScores.distanceScore >= 95) {
    strengths.push('Provides maximum fuel/distance efficiency (shortest path).');
  }
  if (subScores.safetyScore >= 80) {
    strengths.push('Presents a highly secure path, avoiding critical safety hazards.');
  } else if (subScores.safetyScore >= 55) {
    strengths.push('Maintains an acceptable geographic risk index.');
  }

  if (subScores.environmentalScore >= 80) {
    strengths.push('Passes through regions with stable meteorological and atmospheric conditions.');
  }

  // Evaluate warnings from risk factors
  if (route.riskScore > 50) {
    warnings.push('Traverses geographic zones with elevated risk warnings.');
  }

  if (subScores.combinedRiskScore > 75) {
    warnings.push('Extremely dangerous combined route risks detected.');
  } else if (subScores.combinedRiskScore > 50) {
    warnings.push('Elevated combined hazard risks: Proceed with caution.');
  }

  // Compile specific warnings from route factors list
  if (route.riskFactors) {
    route.riskFactors.forEach((factor) => {
      if (factor.toLowerCase().includes('flood') || factor.toLowerCase().includes('landslide') || factor.toLowerCase().includes('rain')) {
        warnings.push(factor);
      }
    });
  }

  // Default filler if empty
  if (strengths.length === 0) {
    strengths.push('Presents a balanced route configuration across all criteria.');
  }

  // Formulate a dynamic summary paragraph based on priority/category
  let summary = '';
  if (priority === 'URGENT') {
    summary = `Selected as optimal for urgent transit because it prioritizes duration (${weights.duration}% weight) while avoiding critical safety hazards.`;
  } else if (priority === 'HIGH') {
    summary = `Recommended primarily because it prioritizes safety (${weights.safety}% weight) to guarantee cargo integrity.`;
  } else if (priority === 'LOW') {
    summary = `Recommended because it favors distance efficiency (${weights.distance}% weight), minimizing operational fuel overhead.`;
  } else {
    // NORMAL
    summary = `Selected by the decision engine as the best overall route, providing a balanced trade-off between safety, transit duration, and environmental conditions.`;
  }

  return {
    summary,
    strengths,
    warnings,
    decisionFactors
  };
};

module.exports = {
  generateRouteExplanation
};
