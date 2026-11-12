const { generateDeterministicRoutes } = require('../demoRouteService');
const { getRouteEnvironmentalRisk } = require('../environmentalRisk/environmentalRiskService');
const { getShipmentRecommendation } = require('../recommendation/recommendationService');
const { evaluateAccessibility, evaluateConnectivity } = require('./alertEngine');
const { prioritizeAndFilterAlerts } = require('./alertRules');
const { AlertTypes } = require('./alertConstants');
const { resolveNERLocation } = require('../../utils/locationResolver');

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

/**
 * Evaluates a shipment's active route safety, weather, and decisions
 * to return accessibility, estimated connectivity, and ranked alerts.
 */
const getShipmentAlerts = (shipment) => {
  if (!shipment) {
    throw new Error('Shipment data is required.');
  }

  const shipmentId = shipment._id || shipment.shipmentId;
  const pickupCoords = getCoordinates(shipment.pickup);
  const destCoords = getCoordinates(shipment.destination);

  if (!pickupCoords || !destCoords) {
    throw new Error('Pickup or destination coordinates could not be resolved for shipment.');
  }

  // 1. Generate route alternatives
  const routes = generateDeterministicRoutes(
    pickupCoords,
    destCoords,
    shipment.priority || 'NORMAL',
    shipmentId
  );

  // 2. Fetch environmental risks
  const envRisksMap = {};
  routes.forEach((route) => {
    try {
      const envRisk = getRouteEnvironmentalRisk(route);
      envRisksMap[route.routeId] = envRisk;
    } catch (err) {
      // Ignored for fallback default
    }
  });

  // 3. Load smart recommendations
  let recommendation;
  try {
    recommendation = getShipmentRecommendation(shipment);
  } catch (err) {
    recommendation = {
      recommendationStatus: 'NO_RECOMMENDATION',
      recommendedRouteId: null,
      confidence: { score: 50, level: 'MEDIUM' },
      rankedRoutes: []
    };
  }

  // Determine active route being analyzed (Selected or recommended or first route option)
  const activeRouteId = shipment.selectedRouteId || recommendation.recommendedRouteId || routes[0]?.routeId;
  const activeRoute = routes.find((r) => r.routeId === activeRouteId);
  const envData = envRisksMap[activeRouteId];

  const alerts = [];

  if (activeRoute) {
    const isLandslide = activeRoute.riskFactors?.some((f) => f.toLowerCase().includes('landslide'));
    const isFlood = activeRoute.riskFactors?.some((f) => f.toLowerCase().includes('flood'));

    // Geographic landslide alert
    if (activeRoute.riskScore > 75 && isLandslide) {
      alerts.push({
        id: `geo-landslide-crit-${activeRouteId}`,
        type: AlertTypes.LANDSLIDE_RISK,
        severity: 'CRITICAL',
        title: 'Critical Landslide Alert',
        message: 'The corridor crosses an area with critical landslide susceptibility.',
        shipmentId,
        routeId: activeRouteId,
        source: 'GEOGRAPHIC_ANALYSIS',
        actionable: true,
        action: { label: 'View Safer Route', target: `/routes?shipment=${shipmentId}` }
      });
    } else if (activeRoute.riskScore > 50 && isLandslide) {
      alerts.push({
        id: `geo-landslide-high-${activeRouteId}`,
        type: AlertTypes.LANDSLIDE_RISK,
        severity: 'HIGH',
        title: 'High Landslide Risk Warning',
        message: 'Elevated landslide risk warning detected along mountain passes.',
        shipmentId,
        routeId: activeRouteId,
        source: 'GEOGRAPHIC_ANALYSIS',
        actionable: false
      });
    }

    // Geographic flood alert
    if (activeRoute.riskScore > 75 && isFlood) {
      alerts.push({
        id: `geo-flood-crit-${activeRouteId}`,
        type: AlertTypes.FLOOD_RISK,
        severity: 'CRITICAL',
        title: 'Critical Flood Alert',
        message: 'The corridor passes through critical flood plains showing active inundation.',
        shipmentId,
        routeId: activeRouteId,
        source: 'GEOGRAPHIC_ANALYSIS',
        actionable: true,
        action: { label: 'View Safer Route', target: `/routes?shipment=${shipmentId}` }
      });
    } else if (activeRoute.riskScore > 50 && isFlood) {
      alerts.push({
        id: `geo-flood-high-${activeRouteId}`,
        type: AlertTypes.FLOOD_RISK,
        severity: 'HIGH',
        title: 'High Flood Risk Warning',
        message: 'Elevated flood risk warning detected in low-lying plain basins.',
        shipmentId,
        routeId: activeRouteId,
        source: 'GEOGRAPHIC_ANALYSIS',
        actionable: false
      });
    }

    // High Combined Geographic risks
    if (isLandslide && isFlood) {
      alerts.push({
        id: `geo-combined-high-${activeRouteId}`,
        type: AlertTypes.HIGH_COMBINED_RISK,
        severity: 'HIGH',
        title: 'Multiple Safety Threats Detected',
        message: 'Route crosses multiple high-risk geographic hazard circles.',
        shipmentId,
        routeId: activeRouteId,
        source: 'GEOGRAPHIC_ANALYSIS',
        actionable: true,
        action: { label: 'Compare Routes', target: `/routes?shipment=${shipmentId}` }
      });
    }
  }

  // Environmental risks alerts
  let envRiskScore = 30;
  if (envData) {
    envRiskScore = envData.overallRisk.score;
    const { weather = {} } = envData;

    if (weather.rainfallMm > 50) {
      alerts.push({
        id: `env-rain-high-${activeRouteId}`,
        type: AlertTypes.HEAVY_RAINFALL,
        severity: 'HIGH',
        title: 'Heavy Rainfall Warning',
        message: `Environmental analysis indicates elevated rainfall risk (${weather.rainfallMm} mm).`,
        shipmentId,
        routeId: activeRouteId,
        source: 'ENVIRONMENTAL_INTELLIGENCE',
        actionable: false
      });
    } else if (weather.rainfallMm > 20) {
      alerts.push({
        id: `env-rain-warn-${activeRouteId}`,
        type: AlertTypes.HEAVY_RAINFALL,
        severity: 'WARNING',
        title: 'Rain Warning Active',
        message: `Environmental analysis indicates moderate rainfall precipitation (${weather.rainfallMm} mm).`,
        shipmentId,
        routeId: activeRouteId,
        source: 'ENVIRONMENTAL_INTELLIGENCE',
        actionable: false
      });
    }

    if (weather.visibilityKm < 2.0) {
      alerts.push({
        id: `env-visibility-warn-${activeRouteId}`,
        type: AlertTypes.LOW_VISIBILITY,
        severity: 'WARNING',
        title: 'Reduced Visibility Warning',
        message: `Reduced horizontal visibility (${weather.visibilityKm} km) detected along route samples.`,
        shipmentId,
        routeId: activeRouteId,
        source: 'ENVIRONMENTAL_INTELLIGENCE',
        actionable: false
      });
    }

    if (envRiskScore > 75) {
      alerts.push({
        id: `env-overall-crit-${activeRouteId}`,
        type: AlertTypes.ENVIRONMENTAL_RISK,
        severity: 'CRITICAL',
        title: 'Critical Weather Threat',
        message: 'Inclement environmental conditions represent a critical safety threat.',
        shipmentId,
        routeId: activeRouteId,
        source: 'ENVIRONMENTAL_INTELLIGENCE',
        actionable: true,
        action: { label: 'Analyze Route Alternatives', target: `/routes?shipment=${shipmentId}` }
      });
    }
  }

  // Combined Route Risks alerts
  let combinedRiskScore = activeRoute ? activeRoute.riskScore : 0;
  if (activeRoute && envData) {
    combinedRiskScore = Math.round(activeRoute.riskScore * 0.45 + envRiskScore * 0.55);
  }

  if (combinedRiskScore > 75) {
    alerts.push({
      id: `comb-risk-crit-${activeRouteId}`,
      type: AlertTypes.CRITICAL_ROUTE,
      severity: 'CRITICAL',
      title: 'Critical Combined Route Risk',
      message: `Combined risk score is extremely high (${combinedRiskScore}/100). Safety is severely compromised.`,
      shipmentId,
      routeId: activeRouteId,
      source: 'RISK_INTELLIGENCE',
      actionable: true,
      action: { label: 'View Safer Route', target: `/routes?shipment=${shipmentId}` }
    });
  } else if (combinedRiskScore > 50) {
    alerts.push({
      id: `comb-risk-high-${activeRouteId}`,
      type: AlertTypes.HIGH_COMBINED_RISK,
      severity: 'HIGH',
      title: 'High Route Combined Risks',
      message: `Transit corridor carries high combined risk metrics (${combinedRiskScore}/100).`,
      shipmentId,
      routeId: activeRouteId,
      source: 'RISK_INTELLIGENCE',
      actionable: true,
      action: { label: 'View Safer Route', target: `/routes?shipment=${shipmentId}` }
    });
  } else if (combinedRiskScore > 25) {
    alerts.push({
      id: `comb-risk-warn-${activeRouteId}`,
      type: AlertTypes.ROUTE_CAUTION,
      severity: 'WARNING',
      title: 'Moderate Combined Risk Warning',
      message: `Corridor carries moderate combined hazard warning levels (${combinedRiskScore}/100).`,
      shipmentId,
      routeId: activeRouteId,
      source: 'RISK_INTELLIGENCE',
      actionable: false
    });
  }

  // Smart recommendation alerts
  if (recommendation) {
    if (recommendation.recommendationStatus === 'NO_SAFE_ROUTE') {
      alerts.push({
        id: `rec-no-safe-crit-${shipmentId}`,
        type: AlertTypes.NO_SAFE_ROUTE,
        severity: 'CRITICAL',
        title: 'Safety Alert: No Safe Route Available',
        message: 'No route meets the current safety threshold. Active weather or geographic disasters make corridors unsafe.',
        shipmentId,
        source: 'RECOMMENDATION_ENGINE',
        actionable: true,
        action: { label: 'View Route Analysis', target: `/routes?shipment=${shipmentId}` }
      });
    }

    if (shipment.selectedRouteId && shipment.selectedRouteId !== recommendation.recommendedRouteId && recommendation.recommendedRouteId) {
      alerts.push({
        id: `rec-safer-available-warn-${shipmentId}`,
        type: AlertTypes.ROUTE_CAUTION,
        severity: 'WARNING',
        title: 'Safer Route Available',
        message: 'The selected route is not the top recommendation. A safer alternative path exists.',
        shipmentId,
        source: 'RECOMMENDATION_ENGINE',
        actionable: true,
        action: { label: 'View Recommendation', target: `/routes?shipment=${shipmentId}&recommendation=true` }
      });
    } else if (shipment.selectedRouteId && shipment.selectedRouteId === recommendation.recommendedRouteId) {
      alerts.push({
        id: `rec-recommended-info-${shipmentId}`,
        type: AlertTypes.ROUTE_RECOMMENDED,
        severity: 'INFO',
        title: 'Recommended Route Selected',
        message: 'Transit path aligns with the optimal decision recommendation.',
        shipmentId,
        source: 'RECOMMENDATION_ENGINE',
        actionable: false
      });
    }
  }

  // Urgent shipment alerts
  if (shipment.priority === 'URGENT') {
    if (combinedRiskScore > 50) {
      alerts.push({
        id: `urg-risk-crit-${shipmentId}`,
        type: AlertTypes.URGENT_SHIPMENT_RISK,
        severity: 'CRITICAL',
        title: 'Urgent Cargo Safety Alert',
        message: 'Urgent shipment is affected by elevated route risk. Review safer alternatives before dispatch.',
        shipmentId,
        routeId: activeRouteId,
        source: 'OPERATIONS',
        actionable: true,
        action: { label: 'Review Route Alternatives', target: `/routes?shipment=${shipmentId}` }
      });
    }
  }

  // 4. Accessibility & Connectivity Assessments
  const viableRoutesCount = recommendation?.rankedRoutes?.filter((r) => r.recommendationLevel !== 'AVOID').length ?? 3;
  const accScore = evaluateAccessibility(
    combinedRiskScore,
    envRiskScore,
    recommendation?.recommendationStatus,
    viableRoutesCount
  );

  const connScore = evaluateConnectivity(
    activeRoute || {},
    accScore.accessibilityLevel,
    activeRoute ? activeRoute.riskScore : 0
  );

  // Accessibility alerts
  if (accScore.accessibilityLevel === 'POOR') {
    alerts.push({
      id: `acc-poor-high-${shipmentId}`,
      type: AlertTypes.ACCESSIBILITY_CONCERN,
      severity: 'HIGH',
      title: 'Poor Route Accessibility',
      message: 'Route accessibility is severely limited due to combined geographic and environmental risk.',
      shipmentId,
      source: 'ACCESSIBILITY_INTELLIGENCE',
      actionable: true,
      action: { label: 'View Route Alternatives', target: `/routes?shipment=${shipmentId}` }
    });
  } else if (accScore.accessibilityLevel === 'BLOCKED') {
    alerts.push({
      id: `acc-blocked-crit-${shipmentId}`,
      type: AlertTypes.ACCESSIBILITY_CONCERN,
      severity: 'CRITICAL',
      title: 'Route Accessibility Blocked',
      message: 'Transit corridors are blocked by severe risk factors. Delivery impossible.',
      shipmentId,
      source: 'ACCESSIBILITY_INTELLIGENCE',
      actionable: true,
      action: { label: 'View Route Alternatives', target: `/routes?shipment=${shipmentId}` }
    });
  }

  // Prioritize, filter and cap alerts at 10 items
  const sortedAlerts = prioritizeAndFilterAlerts(alerts);

  return {
    shipmentId,
    alertSummary: {
      total: sortedAlerts.length,
      critical: sortedAlerts.filter((a) => a.severity === 'CRITICAL').length,
      high: sortedAlerts.filter((a) => a.severity === 'HIGH').length,
      warning: sortedAlerts.filter((a) => a.severity === 'WARNING').length,
      info: sortedAlerts.filter((a) => a.severity === 'INFO').length
    },
    alerts: sortedAlerts,
    accessibility: accScore,
    connectivity: connScore,
    generatedAt: new Date().toISOString()
  };
};

module.exports = {
  getShipmentAlerts
};
