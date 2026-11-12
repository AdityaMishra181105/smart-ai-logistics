const { RiskPenalties, ViabilityLevels } = require('./recommendationConstants');
const { getNormalizedWeights, getNormalizedSubScores } = require('./recommendationRules');
const { generateRouteExplanation } = require('./recommendationExplanation');

// Helper: Convert score to risk level label
const getRiskLevelForScore = (score) => {
  if (score > 75) return 'CRITICAL';
  if (score > 50) return 'HIGH';
  if (score > 25) return 'MEDIUM';
  return 'LOW';
};

// Helper: Get penalty points based on risk level
const getPenaltyPoints = (level) => {
  return RiskPenalties[level] || 0;
};

/**
 * Executes multi-criteria decision scoring and ranking over route alternatives.
 * @param {Array} routes - Available routes list
 * @param {Object} envRisksMap - Environmental risks mapping
 * @param {string} priority - Shipment priority
 * @param {string} category - Shipment category
 * @returns {Object} Ranked results, best route selection, and confidence parameters
 */
const runRecommendationEngine = (routes = [], envRisksMap = {}, priority = 'NORMAL', category = 'OTHER') => {
  if (routes.length === 0) {
    return {
      recommendationStatus: 'NO_ROUTES_AVAILABLE',
      recommendedRouteId: null,
      rankedRoutes: [],
      confidence: { score: 30, level: 'LOW', factors: ['No routes generated for shipment.'] }
    };
  }

  // 1. Resolve normalized weights
  const weights = getNormalizedWeights(priority, category);

  // 2. Resolve normalized sub-scores
  const subScoresList = getNormalizedSubScores(routes, envRisksMap);

  // 3. Compute overall score, penalties, and viability for each route option
  const evaluatedRoutes = routes.map((route) => {
    const subs = subScoresList.find((s) => s.routeId === route.routeId) || {
      distanceScore: 50,
      durationScore: 50,
      safetyScore: 50,
      environmentalScore: 50,
      combinedRiskScore: route.riskScore
    };

    // Calculate base weighted score (0 - 100)
    let weightedBase =
      subs.distanceScore * weights.distance +
      subs.durationScore * weights.duration +
      subs.safetyScore * weights.safety +
      subs.environmentalScore * weights.environmental;

    weightedBase = Math.round(weightedBase / 100);

    // Apply risk penalty cuts
    const combinedRiskLevel = getRiskLevelForScore(subs.combinedRiskScore);
    const penalty = getPenaltyPoints(combinedRiskLevel);
    const overallScore = Math.max(0, Math.min(100, weightedBase + penalty));

    // Determine viability classification
    let viability = ViabilityLevels.VIABLE;
    if (combinedRiskLevel === 'CRITICAL') {
      viability = ViabilityLevels.AVOID;
    } else if (combinedRiskLevel === 'HIGH') {
      viability = ViabilityLevels.CAUTION;
    } else if (overallScore >= 80) {
      viability = ViabilityLevels.RECOMMENDED;
    } else if (overallScore >= 55) {
      viability = ViabilityLevels.VIABLE;
    } else {
      viability = ViabilityLevels.CAUTION;
    }

    // Generate explanations and factor lists
    const explanation = generateRouteExplanation(route, subs, weights, priority, category);

    return {
      routeId: route.routeId,
      name: route.name,
      type: route.type,
      overallScore,
      distanceScore: subs.distanceScore,
      durationScore: subs.durationScore,
      safetyScore: subs.safetyScore,
      environmentalScore: subs.environmentalScore,
      combinedRiskScore: subs.combinedRiskScore,
      combinedRiskLevel,
      recommendationLevel: viability,
      reasons: explanation.strengths,
      explanationObj: explanation
    };
  });

  // 4. Sort and rank routes based on viability and scores
  // RECOMMENDED -> VIABLE -> CAUTION -> AVOID
  const getViabilityRank = (level) => {
    switch (level) {
      case ViabilityLevels.RECOMMENDED: return 4;
      case ViabilityLevels.VIABLE: return 3;
      case ViabilityLevels.CAUTION: return 2;
      case ViabilityLevels.AVOID:
      default: return 1;
    }
  };

  const rankedRoutes = [...evaluatedRoutes].sort((a, b) => {
    const rankA = getViabilityRank(a.recommendationLevel);
    const rankB = getViabilityRank(b.recommendationLevel);
    
    if (rankA !== rankB) return rankB - rankA; // Higher viability rank first
    if (a.overallScore !== b.overallScore) return b.overallScore - a.overallScore; // Higher score first
    if (a.combinedRiskScore !== b.combinedRiskScore) return a.combinedRiskScore - b.combinedRiskScore; // Lower risk first
    return a.durationScore - b.durationScore;
  });

  // 5. Select recommended route (highest scoring non-AVOID route)
  const bestRoute = rankedRoutes.find((r) => r.recommendationLevel !== ViabilityLevels.AVOID);
  
  let recommendedRouteId = null;
  let recommendedRoute = null;
  let status = 'RECOMMENDATION_ACTIVE';
  let primaryExplanation = null;

  if (bestRoute) {
    recommendedRouteId = bestRoute.routeId;
    recommendedRoute = bestRoute;
    primaryExplanation = bestRoute.explanationObj;
  } else {
    status = 'NO_SAFE_ROUTE';
    primaryExplanation = {
      summary: 'No route meets the current safety threshold. Active weather or geographic disasters make corridors unsafe.',
      strengths: [],
      warnings: ['All alternatives traverse critical hazard risk circles.'],
      decisionFactors: [`Priority: ${priority}`, `Category: ${category}`]
    };
  }

  // 6. Compute Confidence Score (30 - 100)
  let confidenceScore = 100;
  const confidenceFactors = [];

  // Check if environmental data is present for all routes
  const missingEnv = routes.some((r) => !envRisksMap[r.routeId]);
  if (missingEnv) {
    confidenceScore -= 20;
    confidenceFactors.push('Some route points lack complete environmental weather feeds.');
  }

  // Check if geographic risk metrics exist
  const missingGeo = routes.some((r) => r.riskScore === null || r.riskScore === undefined);
  if (missingGeo) {
    confidenceScore -= 15;
    confidenceFactors.push('Missing geographic disaster boundary maps.');
  }

  // Check if only single route option is available
  if (routes.length === 1) {
    confidenceScore -= 20;
    confidenceFactors.push('Limited alternatives: only 1 route option was evaluated.');
  }

  // Check if scores are very close
  if (rankedRoutes.length > 1 && bestRoute) {
    const secondBest = rankedRoutes.find((r) => r.routeId !== bestRoute.routeId);
    if (secondBest && Math.abs(bestRoute.overallScore - secondBest.overallScore) < 5) {
      confidenceScore -= 10;
      confidenceFactors.push('Decision parameters are closely matched across multiple routes.');
    }
  }

  confidenceScore = Math.max(30, Math.min(100, confidenceScore));

  let confidenceLevel = 'HIGH';
  if (confidenceScore < 50) {
    confidenceLevel = 'LOW';
  } else if (confidenceScore < 80) {
    confidenceLevel = 'MEDIUM';
  }

  if (confidenceFactors.length === 0) {
    confidenceFactors.push('Decision engine has complete access to local weather feeds and risk zone maps.');
  }

  return {
    recommendationStatus: status,
    recommendedRouteId,
    recommendedRoute,
    rankedRoutes,
    confidence: {
      score: confidenceScore,
      level: confidenceLevel,
      factors: confidenceFactors
    },
    decisionAnalysis: {
      shipmentPriority: priority,
      shipmentCategory: category,
      weights,
      primaryFactors: bestRoute ? bestRoute.reasons : ['No safe transit options detected.']
    },
    explanation: primaryExplanation
  };
};

module.exports = {
  runRecommendationEngine
};
